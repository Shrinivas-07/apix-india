# scraper/database.py
# Creates and manages our local SQLite database
# Think of this as the "filing system" for all fare data we collect

import sqlite3
import json
from datetime import datetime
from pathlib import Path

# Database file lives in the data/ folder
DB_PATH = Path("data/fares.db")

def get_connection():
    """Returns a connection to the SQLite database."""
    DB_PATH.parent.mkdir(exist_ok=True)  # create data/ folder if not exists
    return sqlite3.connect(DB_PATH)


def setup_database():
    """
    Creates all tables if they don't already exist.
    Run this once at the start — safe to run multiple times.
    """
    conn = get_connection()
    cursor = conn.cursor()

    # ── Table 1: raw_fares ────────────────────────────────────────────────────
    # Every single fare record we scrape goes here, untouched
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS raw_fares (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            carrier         TEXT,
            origin          TEXT NOT NULL,
            destination     TEXT NOT NULL,
            travel_date     TEXT NOT NULL,
            scraped_at      TEXT NOT NULL,
            advance_days    INTEGER,        -- how many days before travel we scraped
            total_fare      INTEGER,
            base_fare       INTEGER,
            taxes           INTEGER,
            currency        TEXT DEFAULT 'INR',
            fare_class      TEXT DEFAULT 'Economy',
            source          TEXT,           -- e.g. 'google_flights', 'indigo_direct'
            is_outlier      INTEGER DEFAULT 0,  -- 1 if flagged as outlier
            created_at      TEXT DEFAULT (datetime('now'))
        )
    """)

    # ── Table 2: daily_index ──────────────────────────────────────────────────
    # One row per day — the computed APIx number
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS daily_index (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            index_date      TEXT NOT NULL UNIQUE,  -- the date this index is for
            apix_value      REAL NOT NULL,          -- the weighted index number
            routes_used     INTEGER,                -- how many routes contributed
            base_period     TEXT DEFAULT '2026-01', -- what we compare against
            computed_at     TEXT DEFAULT (datetime('now')),
            notes           TEXT
        )
    """)

    # ── Table 3: route_daily_avg ──────────────────────────────────────────────
    # Average fare per route per day — used for index calculation
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS route_daily_avg (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            route_date      TEXT NOT NULL,
            origin          TEXT NOT NULL,
            destination     TEXT NOT NULL,
            advance_days    INTEGER NOT NULL,
            avg_base_fare   REAL,
            min_fare        REAL,
            max_fare        REAL,
            sample_count    INTEGER,        -- how many fares we averaged
            computed_at     TEXT DEFAULT (datetime('now')),
            UNIQUE(route_date, origin, destination, advance_days)
        )
    """)

    conn.commit()
    conn.close()
    print("[DB] Database ready at:", DB_PATH.absolute())


def save_fares(fares: list, advance_days: int = None):
    """
    Saves a list of fare records to raw_fares table.
    
    fares        : list of dicts from our scraper
    advance_days : how many days before travel the fare was scraped (T+1, T+7 etc.)
    """
    if not fares:
        print("[DB] No fares to save.")
        return 0

    conn = get_connection()
    cursor = conn.cursor()

    saved = 0
    for fare in fares:
        try:
            cursor.execute("""
                INSERT INTO raw_fares 
                (carrier, origin, destination, travel_date, scraped_at,
                 advance_days, total_fare, base_fare, taxes, currency,
                 fare_class, source)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                fare.get("carrier"),
                fare.get("origin"),
                fare.get("destination"),
                fare.get("travel_date"),
                fare.get("scraped_at", datetime.now().isoformat()),
                advance_days or fare.get("advance_days"),
                fare.get("total_fare"),
                fare.get("base_fare"),
                fare.get("taxes"),
                fare.get("currency", "INR"),
                fare.get("fare_class", "Economy"),
                fare.get("source"),
            ))
            saved += 1
        except Exception as e:
            print(f"[DB] Error saving fare: {e}")

    conn.commit()
    conn.close()
    print(f"[DB] Saved {saved} fares to database.")
    return saved


def get_all_fares(origin=None, destination=None, limit=100):
    """
    Reads fares from database. Optionally filter by route.
    """
    conn = get_connection()
    cursor = conn.cursor()

    if origin and destination:
        cursor.execute("""
            SELECT * FROM raw_fares 
            WHERE origin=? AND destination=?
            ORDER BY scraped_at DESC 
            LIMIT ?
        """, (origin, destination, limit))
    else:
        cursor.execute("""
            SELECT * FROM raw_fares 
            ORDER BY scraped_at DESC 
            LIMIT ?
        """, (limit,))

    rows = cursor.fetchall()
    columns = [desc[0] for desc in cursor.description]
    conn.close()

    # Return as list of dicts
    return [dict(zip(columns, row)) for row in rows]


def get_stats():
    """
    Returns quick summary stats about what's in our database.
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM raw_fares")
    total_fares = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(DISTINCT origin || destination) FROM raw_fares")
    total_routes = cursor.fetchone()[0]

    cursor.execute("SELECT MIN(scraped_at), MAX(scraped_at) FROM raw_fares")
    date_range = cursor.fetchone()

    cursor.execute("SELECT AVG(base_fare), MIN(base_fare), MAX(base_fare) FROM raw_fares WHERE is_outlier=0")
    fare_stats = cursor.fetchone()

    conn.close()

    return {
        "total_fare_records": total_fares,
        "total_routes": total_routes,
        "earliest_scrape": date_range[0],
        "latest_scrape": date_range[1],
        "avg_base_fare": round(fare_stats[0] or 0),
        "min_base_fare": fare_stats[1],
        "max_base_fare": fare_stats[2],
    }


# ── Run directly to test ──────────────────────────────────────────────────────
if __name__ == "__main__":
    print("Setting up database...")
    setup_database()

    print("\nInserting a test record...")
    test_fare = [{
        "carrier": "TestAir",
        "origin": "DEL",
        "destination": "BOM",
        "travel_date": "2026-09-15",
        "scraped_at": datetime.now().isoformat(),
        "total_fare": 4500,
        "base_fare": 3690,
        "taxes": 810,
        "currency": "INR",
        "fare_class": "Economy",
        "source": "test",
    }]
    save_fares(test_fare, advance_days=2)

    print("\nReading back from database...")
    records = get_all_fares(limit=5)
    for r in records:
        print(f"  {r['origin']}→{r['destination']} | "
              f"₹{r['total_fare']:,} | {r['travel_date']} | {r['source']}")

    print("\nDatabase stats:")
    stats = get_stats()
    for k, v in stats.items():
        print(f"  {k}: {v}")