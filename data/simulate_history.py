# data/simulate_history.py
# Inserts 30 days of simulated fare history into the DB
# This lets us test the dashboard trend chart before we have real 30-day data
# DELETE this file after the hackathon — only for testing

import sys
import sqlite3
import random
from datetime import datetime, timedelta

sys.path.insert(0, ".")
from scraper.database import get_connection, setup_database

setup_database()
conn = get_connection()
cursor = conn.cursor()

# Base fares per route (realistic INR amounts)
BASE_FARES = {
    ("DEL","BOM"): 3800,
    ("DEL","BLR"): 3200,
    ("BOM","BLR"): 2800,
    ("DEL","CCU"): 4200,
    ("MAA","DEL"): 3600,
    ("BLR","HYD"): 2200,
    ("BOM","HYD"): 2600,
    ("CCU","BOM"): 3900,
}

today = datetime.now()
inserted = 0

for days_ago in range(30, 0, -1):
    scrape_date = today - timedelta(days=days_ago)

    # Simulate gradual price increase + festival surge in last 10 days
    trend_factor = 1 + (days_ago * -0.003)        # slow upward trend
    if days_ago <= 10:
        trend_factor *= 1.08                        # festival surge

    for (origin, dest), base in BASE_FARES.items():
        for advance in [1, 7, 15, 30, 45]:
            # Earlier advance = cheaper (realistic dynamic pricing)
            window_factor = {1: 1.4, 7: 1.15, 15: 1.0, 30: 0.92, 45: 0.95}[advance]

            # Generate 5-8 fare records per search
            for _ in range(random.randint(5, 8)):
                noise  = random.uniform(0.88, 1.12)
                fare   = round(base * trend_factor * window_factor * noise)
                b_fare = round(fare * 0.82)
                taxes  = fare - b_fare

                cursor.execute("""
                    INSERT INTO raw_fares
                    (carrier, origin, destination, travel_date, scraped_at,
                     advance_days, total_fare, base_fare, taxes,
                     currency, fare_class, source, is_outlier)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
                """, (
                    random.choice(["IndiGo","Air India","Akasa","SpiceJet"]),
                    origin, dest,
                    (scrape_date + timedelta(days=advance)).strftime("%Y-%m-%d"),
                    scrape_date.isoformat(),
                    advance,
                    fare, b_fare, taxes,
                    "INR", "Economy", "simulated", 0
                ))
                inserted += 1

conn.commit()
conn.close()
print(f"Inserted {inserted} simulated records for last 30 days")
print("Now run: python index/calculate_index.py")