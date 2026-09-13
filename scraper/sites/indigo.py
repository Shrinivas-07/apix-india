# scraper/sites/indigo.py  — v2
# Strategy: control the search form like a real user instead of building a URL
# More reliable because IndiGo's JS renders results only after form interaction

import asyncio
import json
import re
from datetime import datetime, timedelta
from playwright.async_api import async_playwright

async def scrape_indigo(origin: str, destination: str, travel_date: str):
    """
    Scrapes fares from IndiGo by interacting with the search form.
    Returns list of fare records.
    """
    fares = []
    dt = datetime.strptime(travel_date, "%Y-%m-%d")

    print(f"\n[IndiGo] Searching {origin} → {destination} on {travel_date}")

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=False,  # keep False so you can watch
            slow_mo=100      # slows actions by 100ms so you can follow along
        )
        context = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1280, "height": 800},
            locale="en-IN",
        )
        page = await context.new_page()

        try:
            # ── 1. Go to IndiGo homepage ─────────────────────────────────────
            print("[IndiGo] Opening homepage...")
            await page.goto("https://www.goindigo.in", timeout=30000,
                            wait_until="domcontentloaded")
            await page.wait_for_timeout(3000)  # let JS settle

            # Screenshot 1: what does the homepage look like?
            await page.screenshot(path="scraper/debug_step1_homepage.png")
            print("[IndiGo] Screenshot saved: debug_step1_homepage.png")

            # ── 2. Handle cookie / popup if it appears ────────────────────────
            for btn_text in ["Accept", "Accept All", "OK", "Got it", "Close"]:
                try:
                    btn = page.get_by_role("button", name=btn_text)
                    if await btn.is_visible():
                        await btn.click()
                        print(f"[IndiGo] Closed popup: '{btn_text}'")
                        await page.wait_for_timeout(1000)
                        break
                except:
                    pass

            # ── 3. Click the Origin field and type the city ───────────────────
            print(f"[IndiGo] Setting origin to {origin}...")
            origin_selectors = [
                "[placeholder*='From']",
                "[placeholder*='Origin']",
                "[aria-label*='From']",
                "[aria-label*='Origin']",
                "input[name*='origin']",
                "input[name*='from']",
                ".origin input",
                "#origin",
            ]
            origin_clicked = False
            for sel in origin_selectors:
                try:
                    el = page.locator(sel).first
                    if await el.is_visible():
                        await el.click()
                        await page.wait_for_timeout(500)
                        await el.fill("")
                        await el.type(origin, delay=80)
                        await page.wait_for_timeout(1500)
                        # pick first suggestion that appears
                        suggestion = page.locator(
                            f"[class*='suggestion'], [class*='dropdown'] "
                            f">> text={origin}"
                        ).first
                        if await suggestion.is_visible():
                            await suggestion.click()
                        else:
                            await page.keyboard.press("ArrowDown")
                            await page.keyboard.press("Enter")
                        origin_clicked = True
                        print(f"[IndiGo] Origin set via selector: {sel}")
                        break
                except:
                    continue

            if not origin_clicked:
                print("[IndiGo] Could not find origin field — taking screenshot")
                await page.screenshot(path="scraper/debug_step2_origin_fail.png")

            await page.wait_for_timeout(1000)

            # ── 4. Click the Destination field ───────────────────────────────
            print(f"[IndiGo] Setting destination to {destination}...")
            dest_selectors = [
                "[placeholder*='To']",
                "[placeholder*='Destination']",
                "[aria-label*='To']",
                "[aria-label*='Destination']",
                "input[name*='destination']",
                "input[name*='to']",
                ".destination input",
                "#destination",
            ]
            dest_clicked = False
            for sel in dest_selectors:
                try:
                    el = page.locator(sel).first
                    if await el.is_visible():
                        await el.click()
                        await page.wait_for_timeout(500)
                        await el.fill("")
                        await el.type(destination, delay=80)
                        await page.wait_for_timeout(1500)
                        suggestion = page.locator(
                            f"[class*='suggestion'], [class*='dropdown'] "
                            f">> text={destination}"
                        ).first
                        if await suggestion.is_visible():
                            await suggestion.click()
                        else:
                            await page.keyboard.press("ArrowDown")
                            await page.keyboard.press("Enter")
                        dest_clicked = True
                        print(f"[IndiGo] Destination set via selector: {sel}")
                        break
                except:
                    continue

            await page.wait_for_timeout(1000)

            # ── 5. Set the date ───────────────────────────────────────────────
            print(f"[IndiGo] Setting date to {travel_date}...")
            date_selectors = [
                "[placeholder*='Date']",
                "[aria-label*='Date']",
                "[aria-label*='Departure']",
                "input[name*='date']",
                "input[type='date']",
                ".date-picker input",
                "[class*='date'] input",
            ]
            date_set = False
            for sel in date_selectors:
                try:
                    el = page.locator(sel).first
                    if await el.is_visible():
                        await el.click()
                        await page.wait_for_timeout(800)
                        # Try to find the right day in the calendar
                        day_str = str(dt.day)
                        day_el = page.locator(
                            f"[class*='calendar'] >> text='{day_str}', "
                            f"[class*='datepicker'] >> text='{day_str}'"
                        ).first
                        if await day_el.is_visible():
                            await day_el.click()
                        else:
                            # fallback: type the date directly
                            await el.fill(travel_date)
                        date_set = True
                        print(f"[IndiGo] Date set via selector: {sel}")
                        break
                except:
                    continue

            await page.wait_for_timeout(1000)
            await page.screenshot(path="scraper/debug_step3_before_search.png")
            print("[IndiGo] Screenshot saved: debug_step3_before_search.png")

            # ── 6. Click the Search button ────────────────────────────────────
            print("[IndiGo] Clicking search...")
            search_selectors = [
                "button:has-text('Search')",
                "button:has-text('Search Flights')",
                "button:has-text('Find Flights')",
                "[type='submit']",
                "[class*='search-btn']",
                "[class*='search'] button",
            ]
            for sel in search_selectors:
                try:
                    btn = page.locator(sel).first
                    if await btn.is_visible():
                        await btn.click()
                        print(f"[IndiGo] Clicked search via: {sel}")
                        break
                except:
                    continue

            # ── 7. Wait for results ───────────────────────────────────────────
            print("[IndiGo] Waiting for results to load (up to 20 seconds)...")
            await page.wait_for_timeout(8000)  # initial wait
            await page.screenshot(path="scraper/debug_step4_results.png")
            print("[IndiGo] Screenshot saved: debug_step4_results.png")

            # ── 8. Extract ALL rupee prices from the page ─────────────────────
            page_text = await page.inner_text("body")
            raw_prices = re.findall(r'₹\s*([0-9,]+)', page_text)

            # Also try to find prices without ₹ symbol near fare-related words
            # (some sites use INR or just numbers in fare containers)
            raw_prices_2 = re.findall(
                r'(?:INR|Rs\.?)\s*([0-9,]+)', page_text, re.IGNORECASE
            )
            all_raw = raw_prices + raw_prices_2

            print(f"[IndiGo] Found {len(all_raw)} price-like values on page")

            seen = set()  # avoid duplicates
            for price_str in all_raw:
                try:
                    price = int(price_str.replace(",", "").strip())
                    if 1500 <= price <= 40000 and price not in seen:
                        seen.add(price)
                        record = {
                            "carrier": "IndiGo",
                            "origin": origin,
                            "destination": destination,
                            "travel_date": travel_date,
                            "scraped_at": datetime.now().isoformat(),
                            "total_fare": price,
                            "base_fare": round(price * 0.82),
                            "taxes": round(price * 0.18),
                            "currency": "INR",
                            "fare_class": "Economy",
                            "source": "indigo_direct",
                        }
                        fares.append(record)
                except:
                    continue

        except Exception as e:
            print(f"[IndiGo] Exception: {e}")
            try:
                await page.screenshot(path="scraper/debug_exception.png")
                print("[IndiGo] Exception screenshot saved")
            except:
                pass

        finally:
            await page.wait_for_timeout(3000)  # pause so you can see result page
            await browser.close()

    print(f"[IndiGo] Done. Collected {len(fares)} fare records.")
    return fares


# ── Run directly to test ─────────────────────────────────────────────────────
if __name__ == "__main__":
    tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    results = asyncio.run(scrape_indigo("DEL", "BOM", tomorrow))

    print("\n" + "=" * 50)
    print(f"RESULTS: {len(results)} fares found")
    print("=" * 50)
    for r in results[:10]:
        print(f"  ₹{r['total_fare']:,}  →  base ₹{r['base_fare']:,}  +  taxes ₹{r['taxes']:,}")

    with open("scraper/indigo_test_output.json", "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nSaved to: scraper/indigo_test_output.json")
    print(f"Debug screenshots in: scraper/debug_step*.png")