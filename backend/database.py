# backend/database.py
# Handles ALL database operations using Supabase
# This replaces scraper/database.py for cloud storage
# Both local SQLite (dev) and Supabase (production) are supported

import os
import json
from datetime import datetime, timedelta
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()  # reads your .env file

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Check if Supabase is configured
USE_SUPABASE = bool(SUPABASE_URL and SUPABASE_KEY
                    and "your_supabase" not in SUPABASE_URL)


def get_client():
    """Returns Supabase client. Raises clear error if not configured."""
    if not USE_SUPABASE:
        raise ValueError(
            "Supabase not configured. Check SUPABASE_URL and SUPABASE_KEY in .env"
        )
    from supabase import create_client, Client
    client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    return client


def save_fares_cloud(fares: list, advance_days: int = None) -> int:
    """
    Saves fare records to Supabase raw_fares table.
    Returns number of records saved.
    """
    if not fares:
        return 0

    client = get_client()
    saved = 0

    # Prepare records for Supabase (clean up types)
    records = []
    for fare in fares:
        record = {
            "carrier":      fare.get("carrier", "Unknown"),
            "origin":       fare.get("origin"),
            "destination":  fare.get("destination"),
            "travel_date":  fare.get("travel_date"),
            "scraped_at":   fare.get("scraped_at", datetime.now().isoformat()),
            "advance_days": advance_days or fare.get("advance_days"),
            "total_fare":   fare.get("total_fare"),
            "base_fare":    fare.get("base_fare"),
            "taxes":        fare.get("taxes"),
            "currency":     fare.get("currency", "INR"),
            "fare_class":   fare.get("fare_class", "Economy"),
            "source":       fare.get("source"),
            "is_outlier":   bool(fare.get("is_outlier", False)),
        }
        # Skip records missing essential fields
        if record["origin"] and record["destination"] and record["total_fare"]:
            records.append(record)

    # Insert in batches of 100 (Supabase limit per request)
    batch_size = 100
    for i in range(0, len(records), batch_size):
        batch = records[i:i + batch_size]
        try:
            result = client.table("raw_fares").insert(batch).execute()
            saved += len(batch)
        except Exception as e:
            print(f"[SupaDB] Batch insert error: {e}")

    print(f"[SupaDB] Saved {saved}/{len(fares)} fares to Supabase")
    return saved


def get_fares_cloud(origin=None, destination=None,
                    advance_days=None, limit=500):
    """Reads fares from Supabase with optional filters."""
    client = get_client()

    query = client.table("raw_fares").select("*")

    if origin:
        query = query.eq("origin", origin)
    if destination:
        query = query.eq("destination", destination)
    if advance_days:
        query = query.eq("advance_days", advance_days)

    query = query.eq("is_outlier", False)
    query = query.order("scraped_at", desc=True)
    query = query.limit(limit)

    result = query.execute()
    return result.data


def save_index_cloud(index_result: dict):
    """Saves computed APIx to daily_index table in Supabase."""
    client = get_client()

    record = {
        "index_date":  index_result["index_date"],
        "apix_value":  index_result["apix_value"],
        "routes_used": index_result["routes_used"],
        "computed_at": index_result["computed_at"],
        "notes":       index_result.get("route_breakdown", []),
    }

    try:
        # upsert = insert or update if same date exists
        client.table("daily_index").upsert(record).execute()
        print(f"[SupaDB] APIx {index_result['apix_value']} saved for {index_result['index_date']}")
    except Exception as e:
        print(f"[SupaDB] Error saving index: {e}")


def get_index_history_cloud(days=30):
    """Returns last N days of APIx values."""
    client = get_client()
    cutoff = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")

    result = (
        client.table("daily_index")
        .select("index_date, apix_value, routes_used, computed_at")
        .gte("index_date", cutoff)
        .order("index_date", desc=False)
        .execute()
    )
    return result.data


def get_route_averages_cloud(days=7):
    """Returns average fares per route for last N days."""
    client = get_client()
    cutoff = (datetime.now() - timedelta(days=days)).isoformat()

    result = (
        client.table("raw_fares")
        .select("origin, destination, advance_days, base_fare")
        .gte("scraped_at", cutoff)
        .eq("is_outlier", False)
        .execute()
    )
    return result.data


def get_stats_cloud():
    """Quick summary of what's in Supabase."""
    client = get_client()

    total   = client.table("raw_fares").select("id", count="exact").execute()
    routes  = client.table("raw_fares").select("origin, destination").execute()
    index   = client.table("daily_index").select("*").order("index_date", desc=True).limit(1).execute()

    route_set = set(
        (r["origin"], r["destination"]) for r in (routes.data or [])
    )

    latest_apix = None
    if index.data:
        latest_apix = index.data[0]["apix_value"]

    return {
        "total_fare_records": total.count,
        "unique_routes":      len(route_set),
        "latest_apix":        latest_apix,
    }


# ── Test connection ───────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("Testing Supabase connection...")
    print(f"URL configured: {bool(SUPABASE_URL)}")
    print(f"KEY configured: {bool(SUPABASE_KEY)}")
    print(f"Using Supabase: {USE_SUPABASE}")

    if USE_SUPABASE:
        try:
            client = get_client()
            # Try a simple query
            result = client.table("raw_fares").select("id").limit(1).execute()
            print("✓ Supabase connection successful!")
            print(f"✓ raw_fares table exists")

            # Insert one test record
            test = [{
                "carrier":     "TestAir",
                "origin":      "DEL",
                "destination": "BOM",
                "travel_date": "2026-09-20",
                "total_fare":  4500,
                "base_fare":   3690,
                "taxes":       810,
                "advance_days": 7,
                "source":      "connection_test",
                "is_outlier":  False,
            }]
            saved = save_fares_cloud(test, advance_days=7)
            print(f"✓ Test record inserted: {saved} saved")

            stats = get_stats_cloud()
            print(f"✓ Stats: {stats}")

        except Exception as e:
            print(f"✗ Connection failed: {e}")
            print("Check your SUPABASE_URL and SUPABASE_KEY in .env")
    else:
        print("✗ Supabase not configured yet — add keys to .env first")