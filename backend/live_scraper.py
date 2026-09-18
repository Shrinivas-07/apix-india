# backend/live_scraper.py
# Runs continuously inside the FastAPI process
# Scrapes top routes every 15 minutes
# Saves fresh data to Supabase

import asyncio
import sys
import os
import logging
from datetime import datetime, timedelta

sys.path.insert(0, ".")

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("live_scraper")

# Top routes to scrape every 15 minutes
# Only top 4 by weight — keeps each cycle under 15 min
LIVE_ROUTES = [
    {"origin": "DEL", "destination": "BOM", "weight": 12.4},
    {"origin": "DEL", "destination": "BLR", "weight": 8.6},
    {"origin": "BOM", "destination": "BLR", "weight": 6.2},
    {"origin": "DEL", "destination": "CCU", "weight": 5.6},
]

# Windows to scrape in live mode
# T+1 and T+7 only — most relevant for consumers
LIVE_WINDOWS = [1, 7]

# Delay between searches (seconds)
# Shorter than nightly scraper — we need to finish in 15 min
SEARCH_DELAY = 25


async def scrape_one_live(origin, destination, advance_days):
    """Scrapes one route — with memory check."""
    try:
        import psutil
        mem = psutil.virtual_memory()
        if mem.available < 200 * 1024 * 1024:  # Less than 200MB free
            log.warning("[Live] Low memory — skipping scrape this cycle")
            return 0
    except ImportError:
        pass  # psutil not installed — continue anyway

    try:
        from scraper.sites.google_flights import scrape_google_flights
        from scraper.cleaner import clean_fares
        from backend.database import save_fares_cloud
        
    except ImportError:
        log.error("[Live] Missing dependencies for scraping")
        return 0

async def scrape_one_live(origin: str, destination: str,
                           advance_days: int) -> int:
    """Scrapes one route+window and saves to Supabase."""
    try:
        from scraper.sites.google_flights import scrape_google_flights
        from scraper.cleaner import clean_fares
        from backend.database import save_fares_cloud

        travel_date = (
            datetime.now() + timedelta(days=advance_days)
        ).strftime("%Y-%m-%d")

        log.info(f"[Live] Scraping {origin}→{destination} T+{advance_days} "
                 f"(travel {travel_date})")

        raw   = await scrape_google_flights(origin, destination, travel_date)
        clean = clean_fares(raw, origin, destination)
        saved = save_fares_cloud(clean, advance_days=advance_days)

        log.info(f"[Live] {origin}→{destination} T+{advance_days}: "
                 f"{saved} fares saved")
        return saved

    except Exception as e:
        log.error(f"[Live] Error {origin}→{destination} T+{advance_days}: {e}")
        return 0


async def run_live_cycle():
    """Runs one full cycle — all routes × live windows."""
    start = datetime.now()
    log.info(f"\n{'='*50}")
    log.info(f"[Live] Cycle started at {start.strftime('%H:%M:%S')}")
    log.info(f"[Live] Routes: {len(LIVE_ROUTES)} × "
             f"Windows: {len(LIVE_WINDOWS)} = "
             f"{len(LIVE_ROUTES)*len(LIVE_WINDOWS)} searches")
    log.info(f"{'='*50}")

    total = 0
    for route in LIVE_ROUTES:
        for window in LIVE_WINDOWS:
            saved  = await scrape_one_live(
                route["origin"], route["destination"], window
            )
            total += saved

            # Polite delay between searches
            if window != LIVE_WINDOWS[-1] or route != LIVE_ROUTES[-1]:
                log.info(f"[Live] Waiting {SEARCH_DELAY}s...")
                await asyncio.sleep(SEARCH_DELAY)

    elapsed = (datetime.now() - start).seconds
    log.info(f"\n[Live] Cycle done in {elapsed}s · {total} fares saved")

    # Recompute index after scraping
    try:
        await recompute_index()
    except Exception as e:
        log.error(f"[Live] Index recompute failed: {e}")

    return total


async def recompute_index():
    """Recomputes APIx after each live scrape cycle."""
    log.info("[Live] Recomputing APIx...")
    try:
        sys.path.insert(0, ".")
        from index.calculate_index import calculate_apix
        from backend.database import save_index_cloud

        result = calculate_apix()
        if result:
            save_index_cloud(result)
            log.info(f"[Live] APIx updated: {result['apix_value']}")
        else:
            log.warning("[Live] Could not compute index — no data?")
    except Exception as e:
        log.error(f"[Live] Index error: {e}")


async def live_scraper_loop(interval_minutes: int = 15):
    """
    Infinite loop — runs a scrape cycle every N minutes.
    Designed to run as a FastAPI background task.
    """
    log.info(f"[Live] Scraper started — interval: {interval_minutes} min")

    # Wait 30 seconds after startup before first scrape
    # Gives FastAPI time to fully start
    log.info("[Live] Waiting 30s for server startup...")
    await asyncio.sleep(30)

    while True:
        try:
            await run_live_cycle()
        except Exception as e:
            log.error(f"[Live] Cycle failed: {e}")

        next_run = datetime.now() + timedelta(minutes=interval_minutes)
        log.info(f"[Live] Next cycle at {next_run.strftime('%H:%M:%S')}")
        await asyncio.sleep(interval_minutes * 60)