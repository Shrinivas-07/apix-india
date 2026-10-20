# index/calculate_index.py
# Reads fare data from DB and computes the APIx (Airfare Price Index)
#
# How it works:
#   1. For each route, calculate average base fare for each advance window
#   2. Compare to base period (first day we have data = 100)
#   3. Weighted average across all routes using DGCA passenger weights
#   4. Save the final index number back to DB (local SQLite and Supabase)
#
# Run:  python index/calculate_index.py

import sys
import sqlite3
import json
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, ".")

from scraper.routes   import ROUTES
from scraper.database import get_connection, setup_database


# ── Config ────────────────────────────────────────────────────────────────────
# Which advance window to use for the headline index
# T+7 is standard — close enough to be relevant, far enough to be stable
HEADLINE_WINDOW = 7

# Base period — the date we compare everything against (index = 100 on this date)
BASE_PERIOD_FILE = Path("data/base_period.json")


def get_or_create_base_period():
    """
    Loads base period averages from file.
    If file doesn't exist, creates it from today's data.
    """
    if BASE_PERIOD_FILE.exists():
        try:
            with open(BASE_PERIOD_FILE, encoding="utf-8") as f:
                base = json.load(f)
            if base.get("routes"):
                print(f"[Index] Using base period: {base.get('created_date')}")
                return base
        except Exception:
            pass

    # First run — create base period from today's scraped data
    print("[Index] No valid base period found. Creating from available data...")
    base = create_base_period()
    return base


def create_base_period():
    """
    Calculates average fares as the base period (index = 100).
    Saves to data/base_period.json
    """
    conn = get_connection()
    cursor = conn.cursor()

    base = {
        "created_date": datetime.now().strftime("%Y-%m-%d"),
        "headline_window": HEADLINE_WINDOW,
        "routes": {}
    }

    for route in ROUTES:
        origin = route["origin"]
        dest   = route["destination"]

        cursor.execute("""
            SELECT AVG(base_fare)
            FROM raw_fares
            WHERE origin=? AND destination=?
              AND advance_days=?
              AND is_outlier=0
        """, (origin, dest, HEADLINE_WINDOW))

        row = cursor.fetchone()
        avg = row[0] if row else None

        if avg:
            base["routes"][f"{origin}-{dest}"] = round(avg, 2)
            print(f"  Base fare {origin}->{dest} T+{HEADLINE_WINDOW}: INR {avg:,.0f}")
        else:
            # Default fallback if no data yet
            default_fares = {
                "DEL-BOM": 3714.0, "DEL-BLR": 3145.0, "BOM-BLR": 2790.0,
                "DEL-CCU": 4096.0, "MAA-DEL": 3509.0, "BLR-HYD": 2243.0,
                "BOM-HYD": 2608.0, "CCU-BOM": 3756.0
            }
            key = f"{origin}-{dest}"
            base["routes"][key] = default_fares.get(key, 3500.0)
            print(f"  Fallback base fare {origin}->{dest} T+{HEADLINE_WINDOW}: INR {base['routes'][key]:,.0f}")

    conn.close()

    # Save base period
    BASE_PERIOD_FILE.parent.mkdir(exist_ok=True)
    with open(BASE_PERIOD_FILE, "w", encoding="utf-8") as f:
        json.dump(base, f, indent=2)
    print(f"\n[Index] Base period saved to {BASE_PERIOD_FILE}")

    return base


def get_averages_for_date(target_date: str, advance_days=HEADLINE_WINDOW):
    """
    Gets average base fare per route for a specific date (YYYY-MM-DD).
    Checks local SQLite first, then Supabase.
    """
    averages = {}
    conn = get_connection()
    cursor = conn.cursor()

    for route in ROUTES:
        origin = route["origin"]
        dest   = route["destination"]

        cursor.execute("""
            SELECT AVG(base_fare), COUNT(*), MIN(base_fare), MAX(base_fare)
            FROM raw_fares
            WHERE origin=? AND destination=?
              AND advance_days=?
              AND is_outlier=0
              AND scraped_at LIKE ?
        """, (origin, dest, advance_days, f"{target_date}%"))

        row = cursor.fetchone()
        if row and row[0] and row[1] >= 1:
            averages[f"{origin}-{dest}"] = {
                "avg_base_fare": round(row[0], 2),
                "sample_count":  row[1],
                "min_fare":      row[2],
                "max_fare":      row[3],
            }

    conn.close()

    # If local SQLite has no data, check Supabase
    if not averages:
        try:
            from backend.database import get_client, USE_SUPABASE
            if USE_SUPABASE:
                client = get_client()
                res = (
                    client.table("raw_fares")
                    .select("origin, destination, base_fare")
                    .gte("scraped_at", f"{target_date}T00:00:00")
                    .lte("scraped_at", f"{target_date}T23:59:59")
                    .eq("advance_days", advance_days)
                    .eq("is_outlier", False)
                    .limit(2000)
                    .execute()
                )
                if res.data:
                    grouped = {}
                    for r in res.data:
                        k = f"{r['origin']}-{r['destination']}"
                        grouped.setdefault(k, []).append(r["base_fare"])
                    for k, fares in grouped.items():
                        averages[k] = {
                            "avg_base_fare": round(sum(fares) / len(fares), 2),
                            "sample_count":  len(fares),
                            "min_fare":      min(fares),
                            "max_fare":      max(fares),
                        }
        except Exception as e:
            print(f"[Index] Supabase check error: {e}")

    return averages


def get_today_averages(advance_days=HEADLINE_WINDOW):
    """
    Gets today's average base fare for each route.
    'Today' means fares scraped in the last 24 hours (with fallback to latest available scrape date).
    """
    conn = get_connection()
    cursor = conn.cursor()

    cutoff = (datetime.now() - timedelta(hours=24)).isoformat()
    averages = {}

    for route in ROUTES:
        origin = route["origin"]
        dest   = route["destination"]

        cursor.execute("""
            SELECT AVG(base_fare), COUNT(*), MIN(base_fare), MAX(base_fare)
            FROM raw_fares
            WHERE origin=? AND destination=?
              AND advance_days=?
              AND is_outlier=0
              AND scraped_at >= ?
        """, (origin, dest, advance_days, cutoff))

        row = cursor.fetchone()
        avg, count, min_fare, max_fare = row

        if avg and count >= 1:
            averages[f"{origin}-{dest}"] = {
                "avg_base_fare": round(avg, 2),
                "sample_count":  count,
                "min_fare":      min_fare,
                "max_fare":      max_fare,
            }

    conn.close()

    # Fallback to Supabase if local SQLite has 0 records in last 24h
    if not averages:
        try:
            from backend.database import get_client, USE_SUPABASE
            if USE_SUPABASE:
                client = get_client()
                cutoff_iso = (datetime.now() - timedelta(hours=24)).isoformat()
                res = (
                    client.table("raw_fares")
                    .select("origin, destination, base_fare")
                    .gte("scraped_at", cutoff_iso)
                    .eq("advance_days", advance_days)
                    .eq("is_outlier", False)
                    .limit(2000)
                    .execute()
                )
                if res.data:
                    grouped = {}
                    for r in res.data:
                        k = f"{r['origin']}-{r['destination']}"
                        grouped.setdefault(k, []).append(r["base_fare"])
                    for k, fares in grouped.items():
                        averages[k] = {
                            "avg_base_fare": round(sum(fares) / len(fares), 2),
                            "sample_count":  len(fares),
                            "min_fare":      min(fares),
                            "max_fare":      max(fares),
                        }
        except Exception:
            pass

    # If still no data in last 24h, use the latest scrape date available
    if not averages:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT MAX(scraped_at) FROM raw_fares")
        latest_row = cursor.fetchone()
        conn.close()

        if latest_row and latest_row[0]:
            latest_date = latest_row[0][:10]
            print(f"[Index] No fares in last 24h. Falling back to latest scrape date: {latest_date}")
            averages = get_averages_for_date(latest_date, advance_days)

    return averages


def calculate_apix(target_date=None, advance_days=HEADLINE_WINDOW):
    """
    Main function — computes the APIx for a given date.
    
    target_date : "YYYY-MM-DD" or None (defaults to today)
    advance_days: which window to use (default T+7)
    
    Returns dict with index value and breakdown.
    """
    if target_date is None:
        target_date = datetime.now().strftime("%Y-%m-%d")

    print(f"\n{'='*55}")
    print(f"  Computing APIx for {target_date}  (T+{advance_days} window)")
    print(f"{'='*55}")

    # Load base period
    base = get_or_create_base_period()
    base_routes = base.get("routes", {})

    if not base_routes:
        print("[Index] ERROR: Base period has no route data.")
        return None

    # Get route averages for target date (or today/latest)
    if target_date == datetime.now().strftime("%Y-%m-%d"):
        today_avgs = get_today_averages(advance_days)
    else:
        today_avgs = get_averages_for_date(target_date, advance_days)

    if not today_avgs:
        print(f"[Index] No fare data found for {target_date}.")
        return None

    # ── Compute weighted index ────────────────────────────────────────────────
    total_weight_used = 0
    weighted_sum      = 0
    route_breakdown   = []

    routes_with_data = []
    for route in ROUTES:
        key = f"{route['origin']}-{route['destination']}"
        if key in today_avgs and key in base_routes:
            routes_with_data.append(route)

    if not routes_with_data:
        print("[Index] No routes have both fare data and base period data.")
        return None

    total_available_weight = sum(r["weight"] for r in routes_with_data)

    for route in routes_with_data:
        origin = route["origin"]
        dest   = route["destination"]
        key    = f"{origin}-{dest}"

        # Normalize weight so weights of available routes sum to 100
        normalized_weight = (route["weight"] / total_available_weight) * 100

        today_fare = today_avgs[key]["avg_base_fare"]
        base_fare  = base_routes[key]

        # Route price index
        route_index = (today_fare / base_fare) * 100

        # Contribution to overall index
        contribution = (normalized_weight / 100) * route_index

        weighted_sum      += contribution
        total_weight_used += normalized_weight

        route_breakdown.append({
            "route":              key,
            "name":               route["name"],
            "weight":             round(normalized_weight, 2),
            "base_fare":          base_fare,
            "today_fare":         today_fare,
            "route_index":        round(route_index, 2),
            "contribution":       round(contribution, 4),
            "sample_count":       today_avgs[key]["sample_count"],
            "change_pct":         round(((today_fare - base_fare) / base_fare) * 100, 2),
        })

    # Sort by contribution descending
    route_breakdown.sort(key=lambda x: x["contribution"], reverse=True)

    apix_value = round(weighted_sum, 2)

    result = {
        "index_date":        target_date,
        "apix_value":        apix_value,
        "advance_window":    advance_days,
        "routes_used":       len(routes_with_data),
        "total_weight_used": round(total_weight_used, 2),
        "base_date":         base.get("created_date"),
        "computed_at":       datetime.now().isoformat(),
        "route_breakdown":   route_breakdown,
    }

    return result


def save_index_to_db(result: dict):
    """Saves the computed index to daily_index table."""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            INSERT OR REPLACE INTO daily_index
            (index_date, apix_value, routes_used, computed_at, notes)
            VALUES (?, ?, ?, ?, ?)
        """, (
            result["index_date"],
            result["apix_value"],
            result["routes_used"],
            result["computed_at"],
            json.dumps(result["route_breakdown"])
        ))
        conn.commit()
        print(f"[Index] APIx saved to local SQLite daily_index.")
    except Exception as e:
        print(f"[Index] Error saving to DB: {e}")
    finally:
        conn.close()


def backfill_history():
    """
    Computes and saves APIx for all distinct dates found in raw_fares.
    Backfills daily_index so the trend chart has full history.
    """
    print("\n[Backfill] Scanning for distinct dates in raw_fares...")
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT DISTINCT SUBSTR(scraped_at, 1, 10) as dt
        FROM raw_fares
        WHERE is_outlier=0
        ORDER BY dt ASC
    """)
    dates = [r[0] for r in cursor.fetchall() if r[0]]
    conn.close()

    print(f"[Backfill] Found {len(dates)} dates to compute index for.")

    from backend.database import save_index_cloud, USE_SUPABASE

    computed_count = 0
    latest_result = None

    for dt in dates:
        res = calculate_apix(target_date=dt)
        if res:
            save_index_to_db(res)
            if USE_SUPABASE:
                try:
                    save_index_cloud(res)
                except Exception as e:
                    print(f"  [Backfill] Supabase save error for {dt}: {e}")
            computed_count += 1
            latest_result = res

    print(f"[Backfill] Completed: {computed_count}/{len(dates)} dates computed & stored.")
    return latest_result


def print_result(result: dict):
    """Prints a summary of the index result in safe ASCII format."""
    print(f"\n{'='*55}")
    print(f"  INDIA AIRFARE PRICE INDEX (APIx)")
    print(f"  Date   : {result['index_date']}")
    print(f"  Window : T+{result['advance_window']} days")
    print(f"  Routes : {result['routes_used']} routes used")
    print(f"{'='*55}")
    print(f"\n  APIx = {result['apix_value']}")
    print(f"  (Base period {result['base_date']} = 100.00)")

    if result["apix_value"] > 100:
        change = result["apix_value"] - 100
        print(f"  Fares are {change:.1f}% HIGHER than base period")
    elif result["apix_value"] < 100:
        change = 100 - result["apix_value"]
        print(f"  Fares are {change:.1f}% LOWER than base period")
    else:
        print(f"  Fares are at base period level")

    print(f"\n  Route breakdown:")
    print(f"  {'Route':<15} {'Weight':>7} {'Base':>8} {'Today':>8} {'Index':>7} {'Delta%':>7}")
    print(f"  {'-'*15} {'-'*7} {'-'*8} {'-'*8} {'-'*7} {'-'*7}")

    for r in result["route_breakdown"]:
        delta = r["change_pct"]
        delta_str = f"+{delta}%" if delta > 0 else f"{delta}%"
        print(
            f"  {r['route']:<15} "
            f"{r['weight']:>6.1f}% "
            f"INR {r['base_fare']:>6,.0f} "
            f"INR {r['today_fare']:>6,.0f} "
            f"{r['route_index']:>7.1f} "
            f"{delta_str:>7}"
        )

    print(f"\n  Total weight used: {result['total_weight_used']:.1f}%")
    print(f"{'='*55}\n")


# ── Run directly ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import sys
    sys.path.insert(0, ".")
    from scraper.database import setup_database
    from backend.database import save_index_cloud, USE_SUPABASE

    setup_database()

    # Backfill all available history so daily_index has the full 30-day timeline
    latest = backfill_history()

    if latest:
        print_result(latest)

        # Save JSON files
        output_path = Path("data/latest_index.json")
        with open(output_path, "w", encoding="utf-8") as f:
            summary = {k: v for k, v in latest.items()
                      if k != "route_breakdown"}
            json.dump(summary, f, indent=2)

        full_path = Path("data/latest_index_full.json")
        with open(full_path, "w", encoding="utf-8") as f:
            json.dump(latest, f, indent=2, ensure_ascii=False)

        print(f"Saved locally and to Supabase.")
    else:
        print("No fare data available to calculate index.")
