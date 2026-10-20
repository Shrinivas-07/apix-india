# scraper/run_scraper.py
# THE MASTER SCRIPT — runs everything in one go
# Scrapes all routes × all advance windows → cleans → saves to DB
#
# Usage:
#   python scraper/run_scraper.py            ← scrape all routes
#   python scraper/run_scraper.py DEL BOM    ← scrape one route only

import asyncio
import sys
import os
import time
from datetime import datetime, timedelta

# Add project root to path
sys.path.insert(0, ".")

from scraper.routes   import ROUTES, ADVANCE_WINDOWS
from scraper.cleaner  import clean_fares
from scraper.database import setup_database, save_fares, get_stats
from dotenv import load_dotenv
load_dotenv()
from scraper.sites.google_flights import scrape_google_flights


# ── Config ────────────────────────────────────────────────────────────────────
DELAY_BETWEEN_SEARCHES = 8   # seconds to wait between each search (be polite)
IS_CI   = os.environ.get("CI", "false").lower() == "true"
HEADLESS = True if IS_CI else False  # auto headless in GitHub Actions


async def scrape_one_window(origin, destination, advance_days):
    """
    Scrapes one route for one advance window.
    Saves to both local SQLite and Supabase (if configured).
    """
    travel_date = (datetime.now() + timedelta(days=advance_days)).strftime("%Y-%m-%d")

    print(f"\n{'-'*55}")
    print(f"  Route : {origin} -> {destination}")
    print(f"  Window: T+{advance_days} days  (travel on {travel_date})")
    print(f"{'-'*55}")

    try:
        raw_fares = await scrape_google_flights(origin, destination, travel_date)
        cleaned   = clean_fares(raw_fares, origin, destination)

        # 1. Always save locally so local SQLite is fully up-to-date
        local_saved = save_fares(cleaned, advance_days=advance_days)

        # 2. Also save to Supabase if configured
        cloud_saved = 0
        try:
            from backend.database import save_fares_cloud, USE_SUPABASE
            if USE_SUPABASE:
                cloud_saved = save_fares_cloud(cleaned, advance_days=advance_days)
        except Exception as e:
            print(f"  [Supabase] Cloud save skipped/failed: {e}")

        return cloud_saved if cloud_saved > 0 else local_saved
    except Exception as e:
        print(f"  [ERROR] {origin}->{destination} T+{advance_days}: {e}")
        return 0


async def run_all(target_origin=None, target_dest=None):
    """
    Main loop — iterates routes × advance windows.
    If target_origin/dest given, only scrapes that one route.
    """
    setup_database()

    start_time = time.time()
    total_saved = 0
    total_searches = 0
    failed = []

    # Filter routes if specific route requested
    routes_to_run = ROUTES
    if target_origin and target_dest:
        routes_to_run = [
            r for r in ROUTES
            if r["origin"] == target_origin.upper()
            and r["destination"] == target_dest.upper()
        ]
        if not routes_to_run:
            print(f"Route {target_origin}->{target_dest} not found in routes.py")
            return

    print("\n" + "=" * 55)
    print(f"  APIx SCRAPER — {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"  Routes  : {len(routes_to_run)}")
    print(f"  Windows : {ADVANCE_WINDOWS}  ({len(ADVANCE_WINDOWS)} per route)")
    print(f"  Total   : {len(routes_to_run) * len(ADVANCE_WINDOWS)} searches")
    print("=" * 55)

    for route in routes_to_run:
        origin = route["origin"]
        dest   = route["destination"]
        name   = route["name"]
        weight = route["weight"]

        print(f"\n\n{'='*55}")
        print(f"  ROUTE: {name}  (weight: {weight}%)")
        print(f"{'='*55}")

        for advance_days in ADVANCE_WINDOWS:
            saved = await scrape_one_window(origin, dest, advance_days)
            total_saved    += saved
            total_searches += 1

            if saved == 0:
                failed.append(f"{origin}->{dest} T+{advance_days}")

            # Polite delay between searches so we don't get blocked
            if advance_days != ADVANCE_WINDOWS[-1]:
                print(f"  Waiting {DELAY_BETWEEN_SEARCHES}s before next window...")
                await asyncio.sleep(DELAY_BETWEEN_SEARCHES)

        # Longer pause between routes
        if route != routes_to_run[-1]:
            pause = DELAY_BETWEEN_SEARCHES * 2
            print(f"\n  Route done. Pausing {pause}s before next route...")
            await asyncio.sleep(pause)

    # ── Final summary ─────────────────────────────────────────────────────────
    elapsed = round(time.time() - start_time)
    minutes = elapsed // 60
    seconds = elapsed % 60

    print("\n\n" + "=" * 55)
    print(f"  SCRAPE COMPLETE")
    print(f"  Time taken  : {minutes}m {seconds}s")
    print(f"  Searches    : {total_searches}")
    print(f"  Fares saved : {total_saved}")
    if failed:
        print(f"  Failed      : {len(failed)}")
        for f in failed:
            print(f"    - {f}")
    print("=" * 55)

    # DB stats
    print("\nDatabase now contains:")
    stats = get_stats()
    for k, v in stats.items():
        print(f"  {k}: {v}")


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    # Check for optional route argument
    # Usage: python scraper/run_scraper.py DEL BOM
    if len(sys.argv) == 3:
        orig = sys.argv[1]
        dest = sys.argv[2]
        print(f"Single route mode: {orig} -> {dest}")
        asyncio.run(run_all(orig, dest))
    else:
        print("Full run mode: all routes x all windows")
        asyncio.run(run_all())
