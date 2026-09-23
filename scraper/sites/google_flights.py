# scraper/sites/google_flights.py  — rename this file too (explained below)
# Strategy: scrape Google Flights which shows all Indian carriers together
# Much more reliable than individual airline sites for price collection

import asyncio
import json
import re
import os
from datetime import datetime, timedelta
from playwright.async_api import async_playwright


async def scrape_google_flights(origin: str, destination: str, travel_date: str):
    """
    Scrapes fares from Google Flights for a given route and date.
    Returns fares from ALL carriers shown (IndiGo, Air India, Akasa, SpiceJet etc.)
    
    origin       : IATA code e.g. "DEL"
    destination  : IATA code e.g. "BOM"  
    travel_date  : "YYYY-MM-DD"
    """
    fares = []

    # Google Flights URL format — direct search URL, no form filling needed
    url = (
        f"https://www.google.com/travel/flights/search"
        f"?tfs=CBwQAhoeEgoyMDI2MDkxNApIAFILCgsvbS8wMWZsZHQgARoAQAFIAXABggELCP___________wGYAQI"
    )

    # Build proper Google Flights URL
    # Format: /flights?hl=en&gl=in&curr=INR
    dt = datetime.strptime(travel_date, "%Y-%m-%d")
    date_formatted = dt.strftime("%Y-%m-%d")

    # Direct URL that works reliably
    search_url = (
        f"https://www.google.com/travel/flights?"
        f"hl=en&gl=in&curr=INR"
    )

    print(f"\n[GoogleFlights] Searching {origin} → {destination} on {travel_date}")

    async with async_playwright() as p:
                # Auto-detect if running in CI/GitHub Actions
        is_ci = os.environ.get("CI", "false").lower() == "true"

        browser = await p.chromium.launch(
            headless=True if is_ci else False,
            slow_mo=0 if is_ci else 80,
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

        # Hide automation signals
        await page.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
        """)

        try:
            # ── 1. Open Google Flights ────────────────────────────────────────
            print("[GoogleFlights] Opening Google Flights...")
            await page.goto(
                "https://www.google.com/travel/flights",
                timeout=30000,
                wait_until="domcontentloaded"
            )
            await page.wait_for_timeout(3000)
            await page.screenshot(path="scraper/debug_gf_step1.png")
            print("[GoogleFlights] Step 1 screenshot saved")

            # ── 2. Handle cookie consent (appears in India sometimes) ─────────
            for txt in ["Accept all", "Accept All", "I agree", "Agree"]:
                try:
                    btn = page.get_by_role("button", name=txt)
                    if await btn.is_visible():
                        await btn.click()
                        print(f"[GoogleFlights] Accepted cookies: {txt}")
                        await page.wait_for_timeout(1500)
                        break
                except:
                    pass

            # ── 3. Clear and set Origin ───────────────────────────────────────
            print(f"[GoogleFlights] Setting origin: {origin}")

            # Google Flights origin input
            origin_input = page.locator('input[placeholder="Where from?"]').first
            try:
                await origin_input.wait_for(timeout=8000)
                await origin_input.click()
                await page.wait_for_timeout(500)
                # Select all existing text and replace
                await origin_input.press("Control+a")
                await origin_input.press("Backspace")
                await page.wait_for_timeout(300)
                await origin_input.type(origin, delay=100)
                await page.wait_for_timeout(2000)

                # Click the first suggestion in the dropdown
                first_suggestion = page.locator('li[role="option"]').first
                await first_suggestion.wait_for(timeout=5000)
                await first_suggestion.click()
                print(f"[GoogleFlights] Origin '{origin}' selected")
                await page.wait_for_timeout(1000)
            except Exception as e:
                print(f"[GoogleFlights] Origin input issue: {e}")
                await page.screenshot(path="scraper/debug_gf_origin_fail.png")

            # ── 4. Set Destination ────────────────────────────────────────────
            print(f"[GoogleFlights] Setting destination: {destination}")

            dest_input = page.locator('input[placeholder="Where to?"]').first
            try:
                await dest_input.wait_for(timeout=8000)
                await dest_input.click()
                await page.wait_for_timeout(500)
                await dest_input.press("Control+a")
                await dest_input.press("Backspace")
                await page.wait_for_timeout(300)
                await dest_input.type(destination, delay=100)
                await page.wait_for_timeout(2000)

                first_suggestion = page.locator('li[role="option"]').first
                await first_suggestion.wait_for(timeout=5000)
                await first_suggestion.click()
                print(f"[GoogleFlights] Destination '{destination}' selected")
                await page.wait_for_timeout(1000)
            except Exception as e:
                print(f"[GoogleFlights] Destination input issue: {e}")
                await page.screenshot(path="scraper/debug_gf_dest_fail.png")

            # ── 5. Set Date ───────────────────────────────────────────────────
            print(f"[GoogleFlights] Setting date: {travel_date}")

            try:
                # Click the departure date field
                date_btn = page.locator(
                    '[data-placeholder="Departure"], '
                    'input[placeholder="Departure"], '
                    '[aria-label*="Departure date"]'
                ).first
                await date_btn.click()
                await page.wait_for_timeout(1500)

                # Type the date in the input that appears
                date_input = page.locator('input[placeholder="Departure"]').first
                await date_input.fill(date_formatted)
                await page.wait_for_timeout(1000)

                # Press Enter or click Done to confirm date
                await page.keyboard.press("Enter")
                await page.wait_for_timeout(1000)

                # Click Done button if it appears
                try:
                    done_btn = page.get_by_role("button", name="Done")
                    if await done_btn.is_visible():
                        await done_btn.click()
                except:
                    pass

                print("[GoogleFlights] Date set")
                await page.wait_for_timeout(1000)
            except Exception as e:
                print(f"[GoogleFlights] Date issue: {e}")
                await page.screenshot(path="scraper/debug_gf_date_fail.png")

            await page.screenshot(path="scraper/debug_gf_step3_before_search.png")
            print("[GoogleFlights] Before-search screenshot saved")

            # ── 6. Click Search ───────────────────────────────────────────────
            print("[GoogleFlights] Clicking Search...")
            try:
                search_btn = page.get_by_role("button", name="Search").first
                await search_btn.click()
                print("[GoogleFlights] Search clicked")
            except:
                await page.keyboard.press("Enter")
                print("[GoogleFlights] Pressed Enter to search")

            # ── 7. Wait for results ───────────────────────────────────────────
            print("[GoogleFlights] Waiting 12 seconds for all flights to load...")
            await page.wait_for_timeout(12000)
            await page.screenshot(path="scraper/debug_gf_step4_results.png")
            print("[GoogleFlights] Results screenshot saved")

            # ── 8. Scroll down to load more results ───────────────────────────
            await page.evaluate("window.scrollBy(0, 1000)")
            await page.wait_for_timeout(3000)
            await page.evaluate("window.scrollBy(0, 1000)")
            await page.wait_for_timeout(2000)

            # ── 9. Extract fares ──────────────────────────────────────────────
            page_text = await page.inner_text("body")

            # Save raw text for debugging
            with open("scraper/debug_raw_page_text.txt", "w", encoding="utf-8") as f:
                f.write(page_text)
            print("[GoogleFlights] Raw page text saved to debug_raw_page_text.txt")

            # Find all ₹ prices
            raw_prices = re.findall(r'₹\s*([0-9,]+)', page_text)
            print(f"[GoogleFlights] Found {len(raw_prices)} ₹ price values")

            # Find carrier names mentioned near prices
            carriers_found = []
            for carrier in ["IndiGo", "Air India", "Akasa", "SpiceJet",
                            "Vistara", "Star Air", "Alliance Air"]:
                if carrier.lower() in page_text.lower():
                    carriers_found.append(carrier)
            print(f"[GoogleFlights] Carriers mentioned: {carriers_found}")

            seen = set()
            for price_str in raw_prices:
                try:
                    price = int(price_str.replace(",", "").strip())
                    if 1500 <= price <= 40000 and price not in seen:
                        seen.add(price)
                        record = {
                            "carrier": "Multiple",  # Google shows all carriers
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
                        }
                        fares.append(record)
                except:
                    continue

            # Sort by price
            fares.sort(key=lambda x: x["total_fare"])

        except Exception as e:
            print(f"[GoogleFlights] Exception: {e}")
            try:
                await page.screenshot(path="scraper/debug_gf_exception.png")
            except:
                pass

        finally:
            await page.wait_for_timeout(4000)
            await browser.close()

    print(f"[GoogleFlights] Done. Collected {len(fares)} fare records.")
    return fares


# ── Test directly ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import sys
    sys.path.append(".")  # so we can import from scraper/
    from scraper.database import setup_database, save_fares, get_stats

    # Setup DB if not already done
    setup_database()

    # Scrape tomorrow's fares
    tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    results = asyncio.run(scrape_google_flights("DEL", "BOM", tomorrow))

    print("\n" + "=" * 55)
    print(f"  SCRAPED — {len(results)} fares for DEL → BOM")
    print("=" * 55)
    for i, r in enumerate(results[:15], 1):
        print(f"  {i:2}. ₹{r['total_fare']:>7,}  "
              f"(base ₹{r['base_fare']:,} + taxes ₹{r['taxes']:,})")

    # Save to database — T+1 means 1 day advance purchase
    saved = save_fares(results, advance_days=1)

    # Show updated stats
    print("\nDatabase stats after scrape:")
    stats = get_stats()
    for k, v in stats.items():
        print(f"  {k}: {v}")

    # Also save JSON backup
    with open("scraper/google_flights_output.json", "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nJSON backup → scraper/google_flights_output.json")