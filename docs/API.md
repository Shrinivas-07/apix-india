# APIx REST API Documentation

## Overview

The APIx API provides programmatic access to India's Real-time Airfare Price Index. 
Designed for consumption by NSO statisticians and RBI analysts.

## Base URL


https://apix-india-api.onrender.com



## Authentication

Currently open access (no API key required for prototype).
Production deployment would use API key authentication.

## Rate Limiting

Please limit requests to 60 per minute.

## Endpoints

### 1. Health Check

```http
GET /
```

Confirms API is running and returns version info.

**Example Response:**
```json
{
  "status": "ok",
  "service": "APIx — India Airfare Price Index",
  "version": "1.0.0",
  "timestamp": "2026-09-15T10:30:00.123456",
  "database": "supabase"
}
```

---

### 2. Latest Index

```http
GET /api/index/latest
```

Returns today's national APIx value with full route breakdown.
This is the primary endpoint for CPI integration.

**Example Response:**
```json
{
  "index_date": "2026-09-15",
  "apix_value": 108.4,
  "routes_used": 8,
  "computed_at": "2026-09-15T23:45:00",
  "base_period": "2026-09",
  "route_breakdown": [
    {
      "route": "DEL-BOM",
      "name": "Delhi → Mumbai",
      "weight": 12.4,
      "base_fare": 3800,
      "today_fare": 4120,
      "route_index": 108.4,
      "change_pct": 8.4
    }
  ]
}
```

---

### 3. Index History

```http
GET /api/index/history?days=30
```

Returns daily APIx values for trend analysis.

**Query Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| days | integer | 30 | Number of days of history (max 365) |

**Example Response:**
```json
{
  "days": 30,
  "count": 30,
  "history": [
    { "index_date": "2026-08-16", "apix_value": 98.2 },
    { "index_date": "2026-08-17", "apix_value": 99.1 }
  ],
  "latest": { "index_date": "2026-09-15", "apix_value": 108.4 },
  "earliest": { "index_date": "2026-08-16", "apix_value": 98.2 }
}
```

---

### 4. Route Heatmap

```http
GET /api/routes
```

Returns all tracked routes with current fare and week-on-week change.
Used for sector heatmap visualization.

**Example Response:**
```json
{
  "count": 8,
  "updated_at": "2026-09-15T10:30:00",
  "routes": [
    {
      "route": "DEL-BOM",
      "name": "Delhi → Mumbai",
      "weight": 12.4,
      "avg_fare": 4120,
      "prev_fare": 3980,
      "change_pct": 3.5,
      "trend": "up"
    }
  ]
}
```

---

### 5. Route Detail

```http
GET /api/route/{origin}/{destination}
```

Returns detailed analysis for a single route including lead-time curve.

**Path Parameters:**

| Parameter | Example | Description |
|---|---|---|
| origin | DEL | IATA airport code |
| destination | BOM | IATA airport code |

**Example:** `GET /api/route/DEL/BOM`

**Example Response:**
```json
{
  "route": "DEL-BOM",
  "name": "Delhi → Mumbai",
  "weight": 12.4,
  "lead_time_curve": [
    { "advance_days": 1,  "avg_fare": 5200, "min_fare": 4100, "max_fare": 7800 },
    { "advance_days": 7,  "avg_fare": 4120, "min_fare": 3400, "max_fare": 5600 },
    { "advance_days": 15, "avg_fare": 3890, "min_fare": 3100, "max_fare": 5200 },
    { "advance_days": 30, "avg_fare": 3650, "min_fare": 2900, "max_fare": 4800 },
    { "advance_days": 45, "avg_fare": 3780, "min_fare": 3000, "max_fare": 5100 }
  ],
  "carrier_summary": [
    { "carrier": "IndiGo",    "avg_fare": 3820, "count": 42 },
    { "carrier": "Air India", "avg_fare": 4120, "count": 38 }
  ],
  "recent_count": 165
}
```

---

### 6. Statistics

```http
GET /api/stats
```

Returns database statistics and tracked route list.

---

## Error Responses

| Status | Meaning |
|---|---|
| 200 | Success |
| 404 | No data found — run scraper first |
| 500 | Server error — check logs |

---

## Integration Guide for NSO/RBI

To integrate APIx into CPI computation:

1. Call `/api/index/latest` daily after 12:00 AM IST
2. Use `apix_value` field as the Transport sub-group input
3. Use `route_breakdown` for route-level analysis
4. Call `/api/index/history?days=90` for quarterly trend analysis
