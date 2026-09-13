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

import sys
import os
import json
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, ".")

from fastapi import FastAPI, HTTPException, Query
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

# ── App setup ─────────────────────────────────────────────────────────────────
app = FastAPI(
    title="APIx — India Airfare Price Index",
    description="Real-time airfare price index for India. Built for MoSPI/NSO.",
    version="1.0.0",
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


def compute_route_heatmap():
    """
    Builds heatmap data — avg fare per route for last 7 days
    compared to previous 7 days, to show % change.
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
            .execute()
        )

        previous = (
            client.table("raw_fares")
            .select("origin, destination, base_fare")
            .gte("scraped_at", cutoff_prev)
            .lt("scraped_at", cutoff_recent)
            .eq("is_outlier", False)
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
            .execute()
        )

        # Group by advance window
        windows = {}
        for r in (result.data or []):
            adv = r["advance_days"]
            if adv not in windows:
                windows[adv] = []
            windows[adv].append(r["base_fare"])

        lead_curve = []
        for adv in sorted(windows.keys()):
            fares = windows[adv]
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
        except:
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
    history = get_index_history_cloud(days=days)

    if not history:
        raise HTTPException(
            status_code=404,
            detail="No history found. Run scraper and index calculator first."
        )

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

    if not heatmap:
        raise HTTPException(
            status_code=404,
            detail="No route data found. Run scraper first."
        )

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

    # Get recent fares (last 7 days)
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
    except:
        recent_fares = []

    # Fare breakdown by carrier
    carrier_avgs = {}
    for f in recent_fares:
        c = f.get("carrier", "Unknown")
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

    return {
        "route":           f"{origin}-{destination}",
        "name":            route_config["name"],
        "weight":          route_config["weight"],
        "lead_time_curve": lead_curve,
        "carrier_summary": carrier_summary,
        "recent_count":    len(recent_fares),
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