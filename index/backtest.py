# index/backtest.py
# Compares our APIx methodology against DGCA published data
# This validates our index is accurate
#
# Run: python index/backtest.py

import sys
import json
import sqlite3
from datetime import datetime
from pathlib import Path

sys.path.insert(0, ".")

from scraper.routes   import ROUTES
from scraper.database import get_connection


def load_dgca_data():
    """Loads DGCA reference fare data from JSON file."""
    path = Path("data/dgca_reference.json")
    if not path.exists():
        print("ERROR: data/dgca_reference.json not found")
        return None
    with open(path) as f:
        return json.load(f)


def compute_apix_for_month(year_month: str, advance_days: int = 7):
    """
    Computes APIx for a given month using our database.
    year_month: "2026-09" format
    """
    conn = get_connection()
    cursor = conn.cursor()

    # Get average base fare per route for this month
    month_start = f"{year_month}-01"
    month_end   = f"{year_month}-31"

    route_avgs = {}
    for route in ROUTES:
        origin = route["origin"]
        dest   = route["destination"]

        cursor.execute("""
            SELECT AVG(base_fare), COUNT(*)
            FROM raw_fares
            WHERE origin=? AND destination=?
              AND advance_days=?
              AND is_outlier=0
              AND scraped_at BETWEEN ? AND ?
        """, (origin, dest, advance_days, month_start, month_end))

        row = cursor.fetchone()
        if row and row[0]:
            route_avgs[f"{origin}-{dest}"] = {
                "avg_base_fare": round(row[0], 2),
                "sample_count":  row[1],
            }

    conn.close()
    return route_avgs


def run_backtest():
    """
    Main back-test function.
    Compares our computed index against DGCA data month by month.
    """
    print("\n" + "=" * 60)
    print("  APIx BACK-TEST VALIDATION")
    print("  Comparing our index against DGCA published data")
    print("=" * 60)

    dgca = load_dgca_data()
    if not dgca:
        return

    # Use first month as base period
    base_month    = dgca["data"][0]["month"]
    base_routes   = dgca["data"][0]["routes"]

    results = []

    print(f"\n  Base period: {base_month}")
    print(f"  Source: {dgca['source']}\n")

    print(f"  {'Month':<10} {'Our APIx':>10} {'DGCA Index':>12} {'Diff':>8} {'Match':>8}")
    print(f"  {'─'*10} {'─'*10} {'─'*12} {'─'*8} {'─'*8}")

    for month_data in dgca["data"]:
        month       = month_data["month"]
        dgca_routes = month_data["routes"]

        # Compute DGCA index for this month
        dgca_weighted = 0
        our_weighted  = 0
        total_weight  = 0

        # Get our DB data for this month
        our_avgs = compute_apix_for_month(month)

        for route in ROUTES:
            key    = f"{route['origin']}-{route['destination']}"
            weight = route["weight"]

            # DGCA index for this route
            dgca_curr = dgca_routes.get(key)
            dgca_base = base_routes.get(key)

            if dgca_curr and dgca_base:
                dgca_route_idx = (dgca_curr / dgca_base) * 100
                dgca_weighted += (weight / 100) * dgca_route_idx

            # Our index for this route
            our_data = our_avgs.get(key)
            our_base = base_routes.get(key)

            if our_data and our_base:
                # Convert total DGCA fare to approximate base fare (82%)
                our_base_fare = our_base * 0.82
                our_route_idx = (our_data["avg_base_fare"] / our_base_fare) * 100
                our_weighted  += (weight / 100) * our_route_idx
                total_weight  += weight

        # Normalize
        if total_weight > 0:
            our_apix  = round(our_weighted * (100 / total_weight), 2)
        else:
            our_apix  = None

        dgca_apix = round(dgca_weighted, 2) if dgca_weighted else None

        # Calculate difference
        if our_apix and dgca_apix:
            diff     = round(our_apix - dgca_apix, 2)
            match    = "✓ GOOD" if abs(diff) <= 5 else "△ OK" if abs(diff) <= 10 else "✗ OFF"
        else:
            diff  = "—"
            match = "no data"

        our_str  = f"{our_apix:.2f}"  if our_apix  else "no data"
        dgca_str = f"{dgca_apix:.2f}" if dgca_apix else "—"
        diff_str = f"{diff:+.2f}"     if isinstance(diff, float) else diff

        print(f"  {month:<10} {our_str:>10} {dgca_str:>12} {diff_str:>8} {match:>8}")

        results.append({
            "month":      month,
            "our_apix":   our_apix,
            "dgca_apix":  dgca_apix,
            "difference": diff if isinstance(diff, float) else None,
            "match":      match,
        })

    # Summary statistics
    matched = [r for r in results
               if isinstance(r["difference"], float) and abs(r["difference"]) <= 5]
    with_data = [r for r in results if r["our_apix"] is not None]

    print(f"\n  {'─'*50}")
    print(f"  Months with data  : {len(with_data)}/{len(results)}")
    if with_data:
        print(f"  Within 5 points   : {len(matched)}/{len(with_data)} months")
        accuracy = round(len(matched) / len(with_data) * 100)
        print(f"  Accuracy score    : {accuracy}%")

    print(f"\n  Interpretation:")
    print(f"  ✓ GOOD  = our index within 5 points of DGCA (excellent)")
    print(f"  △ OK    = within 10 points (acceptable)")
    print(f"  ✗ OFF   = more than 10 points off (needs tuning)")

    print(f"\n  Note: Differences expected because:")
    print(f"  - DGCA data includes all fare classes, we track economy only")
    print(f"  - DGCA data is monthly average, ours is T+7 advance window")
    print(f"  - Simulated data used for past months")
    print("=" * 60)

    # Save results to JSON
    output = {
        "run_at":   datetime.now().isoformat(),
        "results":  results,
        "summary": {
            "months_with_data": len(with_data),
            "months_within_5pts": len(matched),
            "accuracy_pct": round(len(matched) / len(with_data) * 100)
            if with_data else 0,
        }
    }

    with open("data/backtest_results.json", "w") as f:
        json.dump(output, f, indent=2)
    print(f"\n  Results saved → data/backtest_results.json")

    return output


if __name__ == "__main__":
    run_backtest()