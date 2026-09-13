# index/calculate_index.py
# Reads fare data from DB and computes the APIx (Airfare Price Index)
#
# How it works:
#   1. For each route, calculate average base fare for each advance window
#   2. Compare to base period (first day we have data = 100)
#   3. Weighted average across all routes using DGCA passenger weights
#   4. Save the final index number back to DB
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
# On first run this is set automatically to today
BASE_PERIOD_FILE = Path("data/base_period.json")


def get_or_create_base_period():
    """
    Loads base period averages from file.
    If file doesn't exist, creates it from today's data.
    """
    if BASE_PERIOD_FILE.exists():
        with open(BASE_PERIOD_FILE) as f:
            base = json.load(f)
        print(f"[Index] Using base period: {base.get('created_date')}")
        return base

    # First run — create base period from today's scraped data
    print("[Index] No base period found. Creating from today's data...")
    base = create_base_period()
    return base


def create_base_period():
    """
    Sets today's average fares as the base period (index = 100).
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

        avg = cursor.fetchone()[0]

        if avg:
            base["routes"][f"{origin}-{dest}"] = round(avg, 2)
            print(f"  Base fare {origin}→{dest} T+{HEADLINE_WINDOW}: ₹{avg:,.0f}")
        else:
            print(f"  No data for {origin}→{dest} T+{HEADLINE_WINDOW} — skipping")

    conn.close()

    # Save base period
    BASE_PERIOD_FILE.parent.mkdir(exist_ok=True)
    with open(BASE_PERIOD_FILE, "w") as f:
        json.dump(base, f, indent=2)
    print(f"\n[Index] Base period saved to {BASE_PERIOD_FILE}")

    return base


def get_today_averages(advance_days=HEADLINE_WINDOW):
    """
    Gets today's average base fare for each route.
    'Today' means fares scraped in the last 24 hours.
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
        print("[Index] ERROR: Base period has no route data. Run scraper first.")
        return None

    # Get today's averages
    today_avgs = get_today_averages(advance_days)

    if not today_avgs:
        print("[Index] No fare data found for today. Run scraper first.")
        return None

    # ── Compute weighted index ────────────────────────────────────────────────
    total_weight_used = 0
    weighted_sum      = 0
    route_breakdown   = []

    # Normalize weights for only the routes we have data for
    routes_with_data = []
    for route in ROUTES:
        key = f"{route['origin']}-{route['destination']}"
        if key in today_avgs and key in base_routes:
            routes_with_data.append(route)

    if not routes_with_data:
        print("[Index] No routes have both today's data and base period data.")
        return None

    total_available_weight = sum(r["weight"] for r in routes_with_data)

    for route in routes_with_data:
        origin = route["origin"]
        dest   = route["destination"]
        key    = f"{origin}-{dest}"

        # Normalize weight so all weights sum to 100
        normalized_weight = (route["weight"] / total_available_weight) * 100

        today_fare = today_avgs[key]["avg_base_fare"]
        base_fare  = base_routes[key]

        # Route price index: how much has this route changed vs base?
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
        print(f"\n[Index] APIx saved to database.")
    except Exception as e:
        print(f"[Index] Error saving to DB: {e}")
    finally:
        conn.close()


def print_result(result: dict):
    """Prints a nice summary of the index result."""
    print(f"\n{'═'*55}")
    print(f"  🇮🇳  INDIA AIRFARE PRICE INDEX (APIx)")
    print(f"  Date   : {result['index_date']}")
    print(f"  Window : T+{result['advance_window']} days")
    print(f"  Routes : {result['routes_used']} routes used")
    print(f"{'═'*55}")
    print(f"\n  APIx = {result['apix_value']}")
    print(f"\n  (Base period {result['base_date']} = 100.00)")

    if result["apix_value"] > 100:
        change = result["apix_value"] - 100
        print(f"  Fares are {change:.1f}% HIGHER than base period")
    elif result["apix_value"] < 100:
        change = 100 - result["apix_value"]
        print(f"  Fares are {change:.1f}% LOWER than base period")
    else:
        print(f"  Fares are at base period level")

    print(f"\n  Route breakdown:")
    print(f"  {'Route':<15} {'Weight':>7} {'Base':>8} {'Today':>8} {'Index':>7} {'Δ%':>6}")
    print(f"  {'─'*15} {'─'*7} {'─'*8} {'─'*8} {'─'*7} {'─'*6}")

    for r in result["route_breakdown"]:
        delta = r["change_pct"]
        delta_str = f"+{delta}%" if delta > 0 else f"{delta}%"
        print(
            f"  {r['route']:<15} "
            f"{r['weight']:>6.1f}% "
            f"₹{r['base_fare']:>7,.0f} "
            f"₹{r['today_fare']:>7,.0f} "
            f"{r['route_index']:>7.1f} "
            f"{delta_str:>6}"
        )

    print(f"\n  Total weight used: {result['total_weight_used']:.1f}%")
    print(f"{'═'*55}\n")


def get_index_history():
    """Returns all saved index values from DB as a list."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT index_date, apix_value, routes_used, computed_at
        FROM daily_index
        ORDER BY index_date ASC
    """)
    rows = cursor.fetchall()
    conn.close()
    return [
        {"date": r[0], "apix": r[1], "routes": r[2], "computed_at": r[3]}
        for r in rows
    ]


# ── Run directly ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import sys
    sys.path.insert(0, ".")
    from scraper.database import setup_database
    from backend.database import save_index_cloud

    setup_database()

    result = calculate_apix()

    if result:
        print_result(result)

        # Save to local DB
        save_index_to_db(result)

        # Save to Supabase
        save_index_cloud(result)

        # Save JSON files
        output_path = Path("data/latest_index.json")
        with open(output_path, "w") as f:
            summary = {k: v for k, v in result.items()
                      if k != "route_breakdown"}
            json.dump(summary, f, indent=2)

        full_path = Path("data/latest_index_full.json")
        with open(full_path, "w") as f:
            json.dump(result, f, indent=2, ensure_ascii=False)

        print(f"\nSaved locally and to Supabase.")
    else:
        print("No data. Run scraper first.")