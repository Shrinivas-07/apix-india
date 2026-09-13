# data/migrate_to_supabase.py
# One-time script: copies everything from local SQLite → Supabase
# Run once, then delete this file

import sys
sys.path.insert(0, ".")

from scraper.database import get_connection
from backend.database import save_fares_cloud, save_index_cloud

print("Starting migration: SQLite → Supabase")

# Read all local fares
conn = get_connection()
cursor = conn.cursor()
cursor.execute("SELECT * FROM raw_fares ORDER BY id")
rows = cursor.fetchall()
cols = [d[0] for d in cursor.description]
conn.close()

fares = [dict(zip(cols, row)) for row in rows]
print(f"Found {len(fares)} fare records in local DB")

# Upload in chunks
chunk = 200
for i in range(0, len(fares), chunk):
    batch = fares[i:i+chunk]
    saved = save_fares_cloud(batch)
    print(f"  Uploaded {i+len(batch)}/{len(fares)}")

print(f"\nMigration complete. {len(fares)} records now in Supabase.")
print("Check your Supabase Table Editor to confirm.")