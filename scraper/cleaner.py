# scraper/cleaner.py
# Cleans raw fare data before saving to database
# Removes outliers, duplicates, and unrealistic prices

from datetime import datetime


# Realistic fare ranges per route type (in INR, base fare)
FARE_BOUNDS = {
    "short":  {"min": 1200,  "max": 12000},   # e.g. BLR-HYD (~1hr)
    "medium": {"min": 1800,  "max": 20000},   # e.g. DEL-BOM (~2hr)
    "long":   {"min": 2500,  "max": 30000},   # e.g. DEL-CCU (~2.5hr)
}

# Route classifications
SHORT_ROUTES  = [("BLR","HYD"), ("BOM","GOI"), ("DEL","JAI")]
LONG_ROUTES   = [("DEL","CCU"), ("BOM","CCU"), ("MAA","CCU")]


def classify_route(origin, destination):
    pair = (origin, destination)
    pair_rev = (destination, origin)
    if pair in SHORT_ROUTES or pair_rev in SHORT_ROUTES:
        return "short"
    if pair in LONG_ROUTES or pair_rev in LONG_ROUTES:
        return "long"
    return "medium"


def clean_fares(fares: list, origin: str, destination: str) -> list:
    """
    Takes raw fare list, returns cleaned list.
    Flags outliers, removes duplicates, validates fields.
    """
    if not fares:
        return []

    route_type = classify_route(origin, destination)
    bounds = FARE_BOUNDS[route_type]

    cleaned   = []
    seen_prices = set()
    removed   = 0
    outliers  = 0

    for fare in fares:
        # ── 1. Must have a total fare ─────────────────────────────────────────
        total = fare.get("total_fare")
        if not total or not isinstance(total, (int, float)):
            removed += 1
            continue

        # ── 2. Remove exact duplicates ────────────────────────────────────────
        if total in seen_prices:
            removed += 1
            continue
        seen_prices.add(total)

        # ── 3. Flag outliers (keep them but mark) ─────────────────────────────
        base = fare.get("base_fare", round(total * 0.82))
        if base < bounds["min"] or base > bounds["max"]:
            fare["is_outlier"] = 1
            outliers += 1
        else:
            fare["is_outlier"] = 0

        # ── 4. Ensure all fields exist ────────────────────────────────────────
        fare.setdefault("carrier",     "Unknown")
        fare.setdefault("currency",    "INR")
        fare.setdefault("fare_class",  "Economy")
        fare.setdefault("base_fare",   round(total * 0.82))
        fare.setdefault("taxes",       round(total * 0.18))
        fare.setdefault("scraped_at",  datetime.now().isoformat())

        cleaned.append(fare)

    print(f"[Cleaner] {origin}→{destination}: "
          f"{len(fares)} raw → {len(cleaned)} clean "
          f"({removed} removed, {outliers} outliers flagged)")

    return cleaned


# ── Test directly ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    test_data = [
        {"total_fare": 4500, "base_fare": 3690, "taxes": 810},
        {"total_fare": 4500, "base_fare": 3690, "taxes": 810},  # duplicate
        {"total_fare": 500,  "base_fare": 410,  "taxes": 90},   # too cheap → outlier
        {"total_fare": 6200, "base_fare": 5084, "taxes": 1116},
        {"total_fare": None},                                     # invalid
    ]
    result = clean_fares(test_data, "DEL", "BOM")
    print(f"\nCleaned records: {len(result)}")
    for r in result:
        print(f"  ₹{r['total_fare']:,}  outlier={r['is_outlier']}")