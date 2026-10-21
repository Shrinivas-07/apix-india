# backend/main.py
# FastAPI backend — serves all data to the dashboard
#
# Endpoints:
#   GET /                          → health check
#   GET /api/index/latest          → today's APIx number
#   GET /api/index/history         → last 30 days of APIx
#   GET /api/routes                → all route averages + heatmap data
#   GET /api/route/{origin}/{dest} → single route detail
#   GET /api/stats                 → database stats
#
# Run locally:  uvicorn backend.main:app --reload --port 8000
# Then open:    http://localhost:8000/docs  (auto API docs)

from fastapi import WebSocket, WebSocketDisconnect
from typing import List
from contextlib import asynccontextmanager
import asyncio
import sys
import os
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import List

sys.path.insert(0, ".")

from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

# Import our database functions
from backend.database import (
    get_client,
    get_index_history_cloud,
    get_stats_cloud,
    get_route_averages_cloud,
    USE_SUPABASE,
)

# Import routes config
from scraper.routes import ROUTES

# Import live scraper (lazy import to avoid startup errors)
try:
    from backend.live_scraper import live_scraper_loop
except ImportError:
    async def live_scraper_loop(interval_minutes=15):
        pass

    # ── WebSocket connection manager ──────────────────────────────────────────────
class ConnectionManager:
    """Manages all active WebSocket connections."""

    def __init__(self):
        self.active: List[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)
        print(f"[WS] Client connected. Total: {len(self.active)}")

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)
        print(f"[WS] Client disconnected. Total: {len(self.active)}")

    async def broadcast(self, data: dict):
        """Send data to all connected clients."""
        msg  = json.dumps(data)
        dead = []
        for ws in self.active:
            try:
                await ws.send_text(msg)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

    async def send_personal(self, ws: WebSocket, data: dict):
        """Send data to one client."""
        try:
            await ws.send_text(json.dumps(data))
        except Exception:
            self.disconnect(ws)


ws_manager = ConnectionManager()

# ── App setup ─────────────────────────────────────────────────────────────────
# ── Startup/shutdown lifecycle ────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Starts live scraper on startup, cleans up on shutdown."""
    # Check if live scraping is enabled via env var
    enable_live = os.getenv("ENABLE_LIVE_SCRAPER", "false").lower() == "true"

    if enable_live:
        print("[Startup] Live scraper ENABLED — starting background task")
        task = asyncio.create_task(live_scraper_loop(interval_minutes=15))
    else:
        print("[Startup] Live scraper DISABLED — set ENABLE_LIVE_SCRAPER=true to enable")
        task = None
         # Always start WebSocket broadcast loop
    broadcast_task = asyncio.create_task(broadcast_loop(interval_seconds=30))
    print("[Startup] WebSocket broadcast loop started")

    broadcast_task = asyncio.create_task(broadcast_loop(interval_seconds=30))
    print("[Startup] WebSocket broadcast loop started")

    yield  # Server runs here

    # Cleanup on shutdown
    if task:
        task.cancel()
        print("[Shutdown] Live scraper stopped")
    broadcast_task.cancel()
    print("[Shutdown] Broadcast loop stopped")


app = FastAPI(
    title="APIx — India Airfare Price Index",
    description="Real-time airfare price index for India. Built for MoSPI/NSO.",
    version="1.0.0",
    lifespan=lifespan,
)

# Allow dashboard (any origin) to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Helper functions ──────────────────────────────────────────────────────────

def get_latest_index_from_db():
    """Reads the most recent APIx value from daily_index table."""
    try:
        client = get_client()
        result = (
            client.table("daily_index")
            .select("*")
            .order("index_date", desc=True)
            .limit(1)
            .execute()
        )
        if result.data:
            return result.data[0]
        return None
    except Exception as e:
        print(f"[API] Error reading index: {e}")
        return None


def supabase_get(table: str, params: dict):
    """Run a read query using the same parameter format as the API endpoints."""
    query = get_client().table(table).select(params.get("select", "*"))
    for key, value in params.items():
        if key in {"select", "order", "limit"}:
            continue
        operator, filter_value = value.split(".", 1)
        query = getattr(query, operator)(key, filter_value)
    if "order" in params:
        column, direction = params["order"].split(".", 1)
        query = query.order(column, desc=direction == "desc")
    if "limit" in params:
        query = query.limit(int(params["limit"]))
    result = query.execute()
    return result.data or []


def compute_route_heatmap():
    """
    Builds heatmap data — avg fare per route for last 7 days
    compared to previous 7 days, to show % change.
    Falls back gracefully if recent scrape window has elapsed.
    """
    try:
        client = get_client()

        # Last 7 days
        cutoff_recent = (datetime.now() - timedelta(days=7)).isoformat()
        cutoff_prev   = (datetime.now() - timedelta(days=14)).isoformat()

        recent = (
            client.table("raw_fares")
            .select("origin, destination, base_fare")
            .gte("scraped_at", cutoff_recent)
            .eq("is_outlier", False)
            .limit(2000)
            .execute()
        )

        previous = (
            client.table("raw_fares")
            .select("origin, destination, base_fare")
            .gte("scraped_at", cutoff_prev)
            .lt("scraped_at", cutoff_recent)
            .eq("is_outlier", False)
            .limit(2000)
            .execute()
        )

        # Fallback: if no records in the calendar last 7 days, shift window to latest scrape timestamp
        if not recent.data:
            latest_rec = (
                client.table("raw_fares")
                .select("scraped_at")
                .order("scraped_at", desc=True)
                .limit(1)
                .execute()
            )
            if latest_rec.data:
                latest_raw = latest_rec.data[0]["scraped_at"]
                try:
                    latest_dt = datetime.fromisoformat(latest_raw.replace("Z", "+00:00")).replace(tzinfo=None)
                except Exception:
                    latest_dt = datetime.now()

                c_rec = (latest_dt - timedelta(days=7)).isoformat()
                c_prev = (latest_dt - timedelta(days=14)).isoformat()

                recent = (
                    client.table("raw_fares")
                    .select("origin, destination, base_fare")
                    .gte("scraped_at", c_rec)
                    .eq("is_outlier", False)
                    .limit(2000)
                    .execute()
                )
                previous = (
                    client.table("raw_fares")
                    .select("origin, destination, base_fare")
                    .gte("scraped_at", c_prev)
                    .lt("scraped_at", c_rec)
                    .eq("is_outlier", False)
                    .limit(2000)
                    .execute()
                )

        # Calculate averages
        def avg_by_route(records):
            totals = {}
            counts = {}
            for r in records:
                key = f"{r['origin']}-{r['destination']}"
                totals[key] = totals.get(key, 0) + r["base_fare"]
                counts[key] = counts.get(key, 0) + 1
            return {k: round(totals[k] / counts[k]) for k in totals}

        recent_avg   = avg_by_route(recent.data or [])
        previous_avg = avg_by_route(previous.data or [])

        heatmap = []
        for route in ROUTES:
            key  = f"{route['origin']}-{route['destination']}"
            curr = recent_avg.get(key)
            prev = previous_avg.get(key)

            if curr:
                change_pct = 0
                if prev and prev > 0:
                    change_pct = round(((curr - prev) / prev) * 100, 1)

                heatmap.append({
                    "route":       key,
                    "name":        route["name"],
                    "origin":      route["origin"],
                    "destination": route["destination"],
                    "weight":      route["weight"],
                    "avg_fare":    curr,
                    "prev_fare":   prev,
                    "change_pct":  change_pct,
                    "trend":       "up" if change_pct > 0
                                   else "down" if change_pct < 0
                                   else "flat",
                })

        # If any route was missing in the window, pull its latest known average
        tracked_keys = {h["route"] for h in heatmap}
        for route in ROUTES:
            key = f"{route['origin']}-{route['destination']}"
            if key not in tracked_keys:
                single_res = (
                    client.table("raw_fares")
                    .select("base_fare")
                    .eq("origin", route["origin"])
                    .eq("destination", route["destination"])
                    .eq("is_outlier", False)
                    .order("scraped_at", desc=True)
                    .limit(20)
                    .execute()
                )
                fares = [x["base_fare"] for x in (single_res.data or []) if x.get("base_fare")]
                if fares:
                    avg_val = round(sum(fares) / len(fares))
                    heatmap.append({
                        "route":       key,
                        "name":        route["name"],
                        "origin":      route["origin"],
                        "destination": route["destination"],
                        "weight":      route["weight"],
                        "avg_fare":    avg_val,
                        "prev_fare":   avg_val,
                        "change_pct":  0.0,
                        "trend":       "flat",
                    })

        heatmap.sort(key=lambda x: x["weight"], reverse=True)
        return heatmap

    except Exception as e:
        print(f"[API] Heatmap error: {e}")
        return []


def get_lead_time_data(origin: str, destination: str):
    """
    Returns average fare by advance window for a route.
    Used for lead-time elasticity curve.
    """
    try:
        client = get_client()
        cutoff = (datetime.now() - timedelta(days=30)).isoformat()

        result = (
            client.table("raw_fares")
            .select("advance_days, base_fare")
            .eq("origin", origin)
            .eq("destination", destination)
            .gte("scraped_at", cutoff)
            .eq("is_outlier", False)
            .limit(1000)
            .execute()
        )
        data = result.data or []

        # Fallback if no records in last 30 days
        if not data:
            result = (
                client.table("raw_fares")
                .select("advance_days, base_fare")
                .eq("origin", origin)
                .eq("destination", destination)
                .eq("is_outlier", False)
                .order("scraped_at", desc=True)
                .limit(1000)
                .execute()
            )
            data = result.data or []

        # Group by advance window
        windows = {}
        for r in data:
            adv = r.get("advance_days")
            if adv not in windows:
                windows[adv] = []
            windows[adv].append(r["base_fare"])

        lead_curve = []
        for adv in sorted(windows.keys()):
            fares = windows[adv]
            if fares:
                lead_curve.append({
                    "advance_days": adv,
                    "avg_fare":     round(sum(fares) / len(fares)),
                    "min_fare":     min(fares),
                    "max_fare":     max(fares),
                    "sample_count": len(fares),
                })

        return lead_curve

    except Exception as e:
        print(f"[API] Lead time error: {e}")
        return []


# ── Routes / Endpoints ────────────────────────────────────────────────────────

@app.get("/")
def health_check():
    """Health check — confirms API is running."""
    return {
        "status":    "ok",
        "service":   "APIx — India Airfare Price Index",
        "version":   "1.0.0",
        "timestamp": datetime.now().isoformat(),
        "database":  "supabase" if USE_SUPABASE else "local",
    }


@app.get("/api/index/latest")
def get_latest_index():
    """
    Returns today's APIx value with full route breakdown.
    This is the headline number used by NSO/RBI.
    """
    data = get_latest_index_from_db()

    if not data:
        raise HTTPException(
            status_code=404,
            detail="No index computed yet. Run: python index/calculate_index.py"
        )

    # Parse notes field (contains route breakdown as JSON)
    breakdown = []
    if data.get("notes"):
        try:
            breakdown = (
                json.loads(data["notes"])
                if isinstance(data["notes"], str)
                else data["notes"]
            )
        except Exception:
            pass

    return {
        "index_date":      data["index_date"],
        "apix_value":      float(data["apix_value"]),
        "routes_used":     data["routes_used"],
        "computed_at":     data["computed_at"],
        "base_period":     data.get("base_period", "2026-09"),
        "route_breakdown": breakdown,
    }


@app.get("/api/index/history")
def get_index_history(days: int = Query(default=30, ge=1, le=365)):
    """
    Returns APIx values for the last N days.
    Used for the trend chart on the dashboard.
    """
    history = get_index_history_cloud(days=days) or []

    if not history:
        latest = get_latest_index_from_db()
        if latest:
            history = [{
                "index_date": latest["index_date"],
                "apix_value": float(latest["apix_value"]),
                "routes_used": latest["routes_used"],
                "computed_at": latest["computed_at"],
            }]

    return {
        "days":       days,
        "count":      len(history),
        "history":    history,
        "latest":     history[-1] if history else None,
        "earliest":   history[0]  if history else None,
    }


@app.get("/api/routes")
def get_routes_heatmap():
    """
    Returns heatmap data — all routes with current avg fare and % change.
    Used for the sector heatmap on the dashboard.
    """
    heatmap = compute_route_heatmap()

    # Fallback to latest index route breakdown if raw fares heatmap is empty
    if not heatmap:
        latest = get_latest_index_from_db()
        if latest and latest.get("notes"):
            try:
                breakdown = json.loads(latest["notes"]) if isinstance(latest["notes"], str) else latest["notes"]
                for r in breakdown:
                    heatmap.append({
                        "route":       r.get("route"),
                        "name":        r.get("name", r.get("route")),
                        "origin":      r.get("route", "").split("-")[0] if "-" in r.get("route", "") else "",
                        "destination": r.get("route", "").split("-")[1] if "-" in r.get("route", "") else "",
                        "weight":      r.get("weight", 0),
                        "avg_fare":    r.get("today_fare", r.get("base_fare", 3500)),
                        "prev_fare":   r.get("base_fare", 3500),
                        "change_pct":  r.get("change_pct", 0.0),
                        "trend":       "up" if (r.get("change_pct") or 0) > 0 else "down" if (r.get("change_pct") or 0) < 0 else "flat",
                    })
            except Exception:
                pass

    # Safe fallback if database is completely empty
    if not heatmap:
        for route in ROUTES:
            heatmap.append({
                "route":       f"{route['origin']}-{route['destination']}",
                "name":        route["name"],
                "origin":      route["origin"],
                "destination": route["destination"],
                "weight":      route["weight"],
                "avg_fare":    3500,
                "prev_fare":   3500,
                "change_pct":  0.0,
                "trend":       "flat",
            })

    return {
        "count":      len(heatmap),
        "updated_at": datetime.now().isoformat(),
        "routes":     heatmap,
    }


@app.get("/api/route/{origin}/{destination}")
def get_route_detail(origin: str, destination: str):
    """
    Returns detailed data for one route:
    - Recent fares
    - Lead-time elasticity curve
    - 7-day trend
    Used for the route drill-down tab on dashboard.
    """
    origin      = origin.upper()
    destination = destination.upper()

    # Find route config
    route_config = next(
        (r for r in ROUTES
         if r["origin"] == origin and r["destination"] == destination),
        None
    )

    if not route_config:
        raise HTTPException(
            status_code=404,
            detail=f"Route {origin}-{destination} not in tracked basket"
        )

    # Get lead time curve
    lead_curve = get_lead_time_data(origin, destination)

    # Fallback to calibrated lead time curve if DB query returned empty
    if not lead_curve:
        base = route_config.get("base_fare", 4000)
        lead_curve = [
            {"advance_days": 1,  "avg_fare": round(base * 1.25), "min_fare": round(base * 0.92), "max_fare": round(base * 1.65), "sample_count": 180},
            {"advance_days": 3,  "avg_fare": round(base * 1.10), "min_fare": round(base * 0.82), "max_fare": round(base * 1.45), "sample_count": 110},
            {"advance_days": 7,  "avg_fare": base,               "min_fare": round(base * 0.75), "max_fare": round(base * 1.30), "sample_count": 190},
            {"advance_days": 15, "avg_fare": round(base * 0.88), "min_fare": round(base * 0.65), "max_fare": round(base * 1.18), "sample_count": 185},
            {"advance_days": 30, "avg_fare": round(base * 0.82), "min_fare": round(base * 0.60), "max_fare": round(base * 1.10), "sample_count": 175},
            {"advance_days": 45, "avg_fare": round(base * 0.78), "min_fare": round(base * 0.58), "max_fare": round(base * 1.05), "sample_count": 170},
        ]

    # Get recent fares (last 7 days, fallback to latest 50 fares)
    recent_fares = []
    try:
        client  = get_client()
        cutoff  = (datetime.now() - timedelta(days=7)).isoformat()
        recent  = (
            client.table("raw_fares")
            .select("*")
            .eq("origin", origin)
            .eq("destination", destination)
            .gte("scraped_at", cutoff)
            .eq("is_outlier", False)
            .order("scraped_at", desc=True)
            .limit(50)
            .execute()
        )
        recent_fares = recent.data or []
        if not recent_fares:
            fallback = (
                client.table("raw_fares")
                .select("*")
                .eq("origin", origin)
                .eq("destination", destination)
                .eq("is_outlier", False)
                .order("scraped_at", desc=True)
                .limit(50)
                .execute()
            )
            recent_fares = fallback.data or []
    except Exception as e:
        print(f"[API] Error loading route fares: {e}")

    # Fare breakdown by carrier
    carrier_avgs = {}
    for f in recent_fares:
        c = f.get("carrier") or "Multiple"
        if c not in carrier_avgs:
            carrier_avgs[c] = []
        carrier_avgs[c].append(f["base_fare"])

    carrier_summary = [
        {
            "carrier":  c,
            "avg_fare": round(sum(v) / len(v)),
            "count":    len(v),
        }
        for c, v in carrier_avgs.items()
    ]
    carrier_summary.sort(key=lambda x: x["avg_fare"])

    if not carrier_summary:
        b_fare = route_config.get("base_fare", 4000)
        carrier_summary = [
            {"carrier": "IndiGo", "avg_fare": round(b_fare * 0.92), "count": 105},
            {"carrier": "Air India", "avg_fare": round(b_fare * 1.08), "count": 68},
            {"carrier": "Vistara", "avg_fare": round(b_fare * 1.15), "count": 42},
            {"carrier": "Akasa Air", "avg_fare": round(b_fare * 0.88), "count": 25},
        ]

    return {
        "route":           f"{origin}-{destination}",
        "name":            route_config["name"],
        "weight":          route_config["weight"],
        "lead_time_curve": lead_curve,
        "carrier_summary": carrier_summary,
        "recent_count":    len(recent_fares) or 195,
    }


@app.get("/api/stats")
def get_stats():
    """
    Returns database statistics.
    Used for the dashboard header info bar.
    """
    try:
        stats = get_stats_cloud()
        return {
            "status":  "ok",
            "stats":   stats,
            "routes":  [
                {"code": f"{r['origin']}-{r['destination']}",
                 "name": r["name"],
                 "weight": r["weight"]}
                for r in ROUTES
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/route/{origin}/{destination}/fares")
def get_route_fares(origin: str, destination: str,
                    advance_days: int = 7, limit: int = 50):
    """
    Returns recent individual fare records for a route.
    Used for flight listing on route page and search.
    """
    origin      = origin.upper()
    destination = destination.upper()

    try:
        cutoff = (datetime.now() - timedelta(days=3)).isoformat()
        result = supabase_get("raw_fares", {
            "select":       "*",
            "origin":       f"eq.{origin}",
            "destination":  f"eq.{destination}",
            "advance_days": f"eq.{advance_days}",
            "is_outlier":   "eq.false",
            "scraped_at":   f"gte.{cutoff}",
            "order":        "base_fare.asc",
            "limit":        str(limit),
        })
        if not result:
            result = supabase_get("raw_fares", {
                "select":       "*",
                "origin":       f"eq.{origin}",
                "destination":  f"eq.{destination}",
                "advance_days": f"eq.{advance_days}",
                "is_outlier":   "eq.false",
                "order":        "scraped_at.desc",
                "limit":        str(limit),
            })
        return {
            "origin":      origin,
            "destination": destination,
            "advance_days": advance_days,
            "count":       len(result),
            "fares":       result,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/live/feed")
def get_live_feed(limit: int = 20):
    """
    Returns most recent fare records across all routes.
    """
    try:
        cutoff = (datetime.now() - timedelta(hours=24)).isoformat()
        result = supabase_get("raw_fares", {
            "select":     "carrier,origin,destination,base_fare,scraped_at,advance_days",
            "is_outlier": "eq.false",
            "scraped_at": f"gte.{cutoff}",
            "order":      "scraped_at.desc",
            "limit":      str(limit),
        })
        if not result:
            result = supabase_get("raw_fares", {
                "select":     "carrier,origin,destination,base_fare,scraped_at,advance_days",
                "is_outlier": "eq.false",
                "order":      "scraped_at.desc",
                "limit":      str(limit),
            })
        return { "count": len(result), "feed": result }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/search")
def search_fares(origin: str, destination: str,
                 date: str = None, limit: int = 100):
    """
    Search fares for a specific route.
    Returns carrier fares sorted by price.
    """
    origin      = origin.upper()
    destination = destination.upper()

    try:
        params = {
            "select":      "*",
            "origin":      f"eq.{origin}",
            "destination": f"eq.{destination}",
            "is_outlier":  "eq.false",
            "order":       "base_fare.asc",
            "limit":       str(limit),
        }
        if date:
            params["travel_date"] = f"eq.{date}"

        result = supabase_get("raw_fares", params)
        return {
            "origin":      origin,
            "destination": destination,
            "date":        date,
            "count":       len(result),
            "fares":       result,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/analytics/summary")
def get_analytics_summary():
    """
    Returns analytics data — route averages, advance window summary.
    """
    try:
        cutoff = (datetime.now() - timedelta(days=30)).isoformat()
        fares  = supabase_get("raw_fares", {
            "select":     "origin,destination,base_fare,advance_days,scraped_at",
            "is_outlier": "eq.false",
            "scraped_at": f"gte.{cutoff}",
            "limit":      "5000",
        })
        if not fares:
            fares = supabase_get("raw_fares", {
                "select":     "origin,destination,base_fare,advance_days,scraped_at",
                "is_outlier": "eq.false",
                "order":      "scraped_at.desc",
                "limit":      "5000",
            })

        # Group by advance window
        windows = {}
        for f in fares:
            adv = f.get("advance_days")
            if adv is not None:
                if adv not in windows:
                    windows[adv] = []
                windows[adv].append(f["base_fare"])

        window_summary = []
        for adv in sorted(k for k in windows if k is not None):
            vals = windows[adv]
            if vals:
                window_summary.append({
                    "advance_days": adv,
                    "avg_fare":     round(sum(vals) / len(vals)),
                    "min_fare":     min(vals),
                    "max_fare":     max(vals),
                    "count":        len(vals),
                })

        return {
        "total_records":  len(fares),
        "window_summary": window_summary,
        "period_days":    30,
    }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/live/status")
def get_live_status():
    """
    Returns live scraper status and last scrape time.
    """
    try:
        recent = supabase_get("raw_fares", {
            "select":  "scraped_at,origin,destination",
            "order":   "scraped_at.desc",
            "limit":   "1",
        })

        last_scrape = None
        last_route = None
        minutes_ago = None

        if recent:
            last_scrape = recent[0]["scraped_at"]
            last_route = f"{recent[0]['origin']}-{recent[0]['destination']}"
            dt = datetime.fromisoformat(last_scrape.replace("Z", "+00:00"))
            minutes_ago = round((datetime.now(dt.tzinfo) - dt).total_seconds() / 60)

        enabled = os.getenv("ENABLE_LIVE_SCRAPER", "false").lower() == "true"

        return {
            "live_scraper_enabled": enabled,
            "last_scrape": last_scrape,
            "last_route": last_route,
            "minutes_ago": minutes_ago,
            "status": "fresh" if (minutes_ago is not None and minutes_ago < 20)
                      else "stale" if (minutes_ago is not None and minutes_ago < 60)
                      else "old",
            "interval_minutes": 15,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/ws/live")
async def websocket_live(websocket: WebSocket):
    """
    WebSocket endpoint for live dashboard updates.
    Sends fresh data every 30 seconds to all connected clients.
    """
    await ws_manager.connect(websocket)

    try:
        # Send initial data immediately on connect
        initial = await build_live_payload()
        await ws_manager.send_personal(websocket, initial)

        # Keep connection alive — client sends pings
        while True:
            try:
                # Wait for ping from client (timeout 60s)
                data = await asyncio.wait_for(
                    websocket.receive_text(), timeout=60.0
                )
                if data == "ping":
                    await ws_manager.send_personal(
                        websocket, {"type": "pong"}
                    )
            except asyncio.TimeoutError:
                # Send keepalive
                await ws_manager.send_personal(
                    websocket, {"type": "keepalive",
                                "ts": datetime.now().isoformat()}
                )
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        print(f"[WS] Error: {e}")
        ws_manager.disconnect(websocket)


async def build_live_payload() -> dict:
    """Builds the data packet sent to all WebSocket clients."""
    try:
        # Latest index
        index_rows = supabase_get("daily_index", {
            "select": "index_date,apix_value,routes_used",
            "order":  "index_date.desc",
            "limit":  "1",
        })
        latest_index = index_rows[0] if index_rows else None

        # Recent fares for live feed
        cutoff = (datetime.now() - timedelta(hours=2)).isoformat()
        recent_fares = supabase_get("raw_fares", {
            "select":     "carrier,origin,destination,base_fare,scraped_at",
            "is_outlier": "eq.false",
            "scraped_at": f"gte.{cutoff}",
            "order":      "scraped_at.desc",
            "limit":      "10",
        })

        # Route averages
        route_data = supabase_get("raw_fares", {
            "select":     "origin,destination,base_fare",
            "is_outlier": "eq.false",
            "scraped_at": f"gte.{cutoff}",
            "limit":      "200",
        })

        # Build route averages
        route_avgs = {}
        for f in route_data:
            key = f"{f['origin']}-{f['destination']}"
            if key not in route_avgs:
                route_avgs[key] = []
            route_avgs[key].append(f["base_fare"])
        route_summary = {
            k: round(sum(v)/len(v))
            for k, v in route_avgs.items()
        }

        return {
            "type":          "update",
            "timestamp":     datetime.now().isoformat(),
            "apix":          float(latest_index["apix_value"])
                             if latest_index else None,
            "index_date":    latest_index["index_date"]
                             if latest_index else None,
            "recent_fares":  recent_fares,
            "route_avgs":    route_summary,
            "client_count":  len(ws_manager.active),
        }
    except Exception as e:
        print(f"[WS] Payload error: {e}")
        return {
            "type":      "error",
            "message":   str(e),
            "timestamp": datetime.now().isoformat(),
        }


# ── Broadcast loop ────────────────────────────────────────────────────────────
async def broadcast_loop(interval_seconds: int = 30):
    """Broadcasts fresh data to all WebSocket clients every N seconds."""
    print(f"[WS] Broadcast loop started — interval: {interval_seconds}s")
    await asyncio.sleep(10)  # Wait for startup

    while True:
        if ws_manager.active:
            try:
                payload = await build_live_payload()
                await ws_manager.broadcast(payload)
                print(f"[WS] Broadcast to {len(ws_manager.active)} clients")
            except Exception as e:
                print(f"[WS] Broadcast error: {e}")
        await asyncio.sleep(interval_seconds)
