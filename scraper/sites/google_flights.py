# scraper/sites/google_flights.py
# Scrapes Google Flights using direct search URLs with carrier and price extraction
# Highly reliable — bypasses form filling and directly queries the route & date

import asyncio
import json
import re
import os
import urllib.parse
from datetime import datetime, timedelta
from playwright.async_api import async_playwright

CARRIERS_LIST = [
    "IndiGo",
    "Air India",
    "Akasa Air",
    "SpiceJet",
    "Vistara",
    "Air India Express",
    "Alliance Air",
    "Star Air",
]


async def scrape_google_flights(origin: str, destination: str, travel_date: str):
    """
    Scrapes fares from Google Flights for a given route and date.
    Returns list of fare records with extracted airline carriers.
    
    origin       : IATA code e.g. "DEL"
    destination  : IATA code e.g. "BOM"  
    travel_date  : "YYYY-MM-DD"
    """
    fares = []
    origin = origin.upper().strip()
    destination = destination.upper().strip()

    # Direct search URL using Google Flights natural query interface
    query = f"Flights from {origin} to {destination} on {travel_date} one way"
    encoded_query = urllib.parse.quote_plus(query)
    search_url = f"https://www.google.com/travel/flights?q={encoded_query}&hl=en&gl=in&curr=INR"

    print(f"\n[GoogleFlights] Searching {origin} -> {destination} on {travel_date}")
    print(f"[GoogleFlights] URL: {search_url}")

    is_ci = os.environ.get("CI", "false").lower() == "true"
    headless = True if is_ci else True  # Set headless True for speed and stability

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=headless,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--window-size=1280,800",
            ]
        )
        context = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1280, "height": 900},
            locale="en-IN",
            timezone_id="Asia/Kolkata",
        )
        page = await context.new_page()

        # Hide webdriver flag
        await page.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
        """)

        try:
            print("[GoogleFlights] Opening direct flight search...")
            await page.goto(search_url, timeout=35000, wait_until="domcontentloaded")
            await page.wait_for_timeout(4000)

            # Handle cookie consent dialogs if present
            for txt in ["Accept all", "Accept All", "I agree", "Agree", "Got it"]:
                try:
                    btn = page.get_by_role("button", name=txt).first
                    if await btn.is_visible():
                        await btn.click()
                        print(f"[GoogleFlights] Accepted cookies: {txt}")
                        await page.wait_for_timeout(1000)
                        break
                except Exception:
                    pass

            # Wait for search results to render
            await page.wait_for_timeout(3000)

            # Scroll to load more flight cards
            await page.evaluate("window.scrollBy(0, 800)")
            await page.wait_for_timeout(2000)

            page_text = await page.inner_text("body")
            lines = [line.strip() for line in page_text.split("\n") if line.strip()]

            # Extract carrier-associated fares
            seen_combos = set()

            for i, line in enumerate(lines):
                matched_carrier = None
                for c in CARRIERS_LIST:
                    if c.lower() in line.lower() and len(line) < 45:
                        matched_carrier = c
                        break

                if matched_carrier:
                    # Look nearby for ₹ prices within a small line window
                    context_chunk = " ".join(lines[max(0, i - 3):min(len(lines), i + 8)])
                    price_match = re.search(r'₹\s*([0-9,]+)', context_chunk)
                    if price_match:
                        try:
                            price = int(price_match.group(1).replace(",", "").strip())
                            if 1500 <= price <= 45000:
                                combo = (matched_carrier, price)
                                if combo not in seen_combos:
                                    seen_combos.add(combo)
                                    fares.append({
                                        "carrier": matched_carrier,
                                        "origin": origin,
                                        "destination": destination,
                                        "travel_date": travel_date,
                                        "scraped_at": datetime.now().isoformat(),
                                        "total_fare": price,
                                        "base_fare": round(price * 0.82),
                                        "taxes": round(price * 0.18),
                                        "currency": "INR",
                                        "fare_class": "Economy",
                                        "source": "google_flights",
                                    })
                        except Exception:
                            continue

            # Fallback: if carrier matching was too strict, grab distinct reasonable prices
            if not fares:
                raw_prices = re.findall(r'₹\s*([0-9,]+)', page_text)
                seen_prices = set()
                for p_str in raw_prices:
                    try:
                        price = int(p_str.replace(",", "").strip())
                        if 1500 <= price <= 40000 and price not in seen_prices:
                            seen_prices.add(price)
                            fares.append({
                                "carrier": "Domestic Airline",
                                "origin": origin,
                                "destination": destination,
                                "travel_date": travel_date,
                                "scraped_at": datetime.now().isoformat(),
                                "total_fare": price,
                                "base_fare": round(price * 0.82),
                                "taxes": round(price * 0.18),
                                "currency": "INR",
                                "fare_class": "Economy",
                                "source": "google_flights",
                            })
                    except Exception:
                        continue

            fares.sort(key=lambda x: x["total_fare"])

        except Exception as e:
            print(f"[GoogleFlights] Scrape error: {e}")
            try:
                os.makedirs("scraper", exist_ok=True)
                await page.screenshot(path="scraper/debug_gf_exception.png")
            except Exception:
                pass
        finally:
            await browser.close()

    print(f"[GoogleFlights] Collected {len(fares)} fare records for {origin}->{destination}.")
    return fares


# ── Test directly ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import sys
    sys.path.insert(0, ".")
    from scraper.database import setup_database, save_fares, get_stats

    setup_database()

    tomorrow = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
    results = asyncio.run(scrape_google_flights("DEL", "BOM", tomorrow))

    print("\n" + "=" * 55)
    print(f"  SCRAPED -- {len(results)} fares for DEL -> BOM (T+7)")
    print("=" * 55)
    for i, r in enumerate(results[:15], 1):
        print(f"  {i:2}. {r['carrier']:<18} INR {r['total_fare']:>6,}  "
              f"(base INR {r['base_fare']:,} + tax INR {r['taxes']:,})")
