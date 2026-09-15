# 🇮🇳 APIx — Real-time Airfare Price Index for India

> **SIH 2026 | Problem Statement SIH26056 | Ministry of Statistics & Programme Implementation (MoSPI)**

A fully automated system that scrapes airfare data from Indian airline websites and OTAs, computes a real-time **Airfare Price Index (APIx)** using passenger-weighted methodology, and serves it via a live dashboard and REST API for consumption by NSO and RBI.

---

## 🔗 Live Links

| Resource | URL |
|---|---|
| 📊 Live Dashboard | https://apix-india-ten.vercel.app |
| 🔌 REST API | https://apix-india-api.onrender.com |
| 📖 API Docs | https://apix-india-api.onrender.com/docs |
| 💾 Source Code | https://github.com/Shrinivas-07/apix-india |

---

## 📌 Problem Statement

The Consumer Price Index (CPI) released by NSO currently collects airfare data **manually** from a limited set of ticketing offices. With over 90% of domestic air tickets now sold online through airline websites and OTAs, manual collection no longer captures the highly dynamic pricing that Indian consumers actually face.

Airfares in India follow dynamic pricing where the same sector can vary by **200-400% within a single day** depending on advance-booking window, day-of-week, demand surges, festival seasons and fuel-price-linked surcharges.

**Our solution**: An automated, scalable, high-frequency data collection system that mirrors what a real Indian traveller pays.

---

## ✅ Solution Overview

Airline / OTA Websites
↓
GitHub Actions (daily 11:30 PM IST)
↓
Playwright Scraper → Data Cleaning → Index Calculation
↓
Supabase (Cloud PostgreSQL)
↓
FastAPI Backend (Render) → React Dashboard (Vercel)
↓
NSO / RBI API Consumption


---

## 🏗️ System Architecture

### Components

| Component | Technology | Purpose |
|---|---|---|
| Scraper | Python + Playwright | Automated fare collection |
| Scheduler | GitHub Actions | Daily runs at 11:30 PM IST |
| Database | Supabase (PostgreSQL) | Stores all fare records |
| Index Engine | Python (pandas) | Computes weighted APIx |
| Backend API | FastAPI + Render | Serves data to dashboard |
| Dashboard | React + Recharts + Vercel | Visual interface |

### Route Basket

Covers **8 major city-pairs** selected by DGCA passenger traffic data:

| Route | Name | Weight |
|---|---|---|
| DEL-BOM | Delhi → Mumbai | 12.4% |
| DEL-BLR | Delhi → Bengaluru | 8.6% |
| BOM-BLR | Mumbai → Bengaluru | 6.2% |
| DEL-CCU | Delhi → Kolkata | 5.6% |
| MAA-DEL | Chennai → Delhi | 5.2% |
| BLR-HYD | Bengaluru → Hyderabad | 3.7% |
| BOM-HYD | Mumbai → Hyderabad | 3.3% |
| CCU-BOM | Kolkata → Mumbai | 2.7% |

### Advance Purchase Windows

Fares captured at **5 windows** per route per day:
`T+1` · `T+7` · `T+15` · `T+30` · `T+45` days

---

## 📐 Index Methodology

The APIx uses a **Laspeyres price index** methodology — the same framework used in India's official CPI.


APIx = Σ (Wᵢ × (Fᵢₜ / Fᵢ₀) × 100)

Where:
Wᵢ = passenger-share weight of route i (from DGCA data)
Fᵢₜ = average base fare on route i today (T+7 window)
Fᵢ₀ = average base fare on route i in base period



**Key design decisions:**
- **Base fare only** — taxes, UDF, fuel surcharge excluded (not market-driven)
- **T+7 headline window** — most representative of typical consumer booking behaviour
- **Passenger-weighted** — high-traffic routes carry more influence
- **Daily frequency** — updated every night automatically

---

## 🔌 API Reference

### Base URL


https://apix-india-api.onrender.com


### Endpoints

#### GET `/`
Health check — confirms API is running.

**Response:**
```json
{
  "status": "ok",
  "service": "APIx — India Airfare Price Index",
  "version": "1.0.0",
  "timestamp": "2026-09-15T10:30:00"
}
```

#### GET `/api/index/latest`
Returns today's APIx value with full route breakdown.

**Response:**
```json
{
  "index_date": "2026-09-15",
  "apix_value": 108.4,
  "routes_used": 8,
  "base_period": "2026-09",
  "route_breakdown": [...]
}
```

#### GET `/api/index/history?days=30`
Returns last N days of APIx values for trend chart.

#### GET `/api/routes`
Returns heatmap data — all routes with current fare and % change.

#### GET `/api/route/{origin}/{destination}`
Returns detailed data for one route including lead-time curve.

**Example:** `/api/route/DEL/BOM`

#### GET `/api/stats`
Returns database statistics.

---

## 📊 Back-test Validation

Our methodology was validated against **DGCA published monthly average fare data**.

Both sides converted to index numbers (base month = 100) to compare price **movements** not absolute levels.

| Month | Our APIx | DGCA Index | Difference | Result |
|---|---|---|---|---|
| 2026-08 | 100.00 | 100.00 | 0.00 | ✓ GOOD |
| 2026-09 | 108.40 | 106.80 | +1.60 | ✓ GOOD |

**Methodology note:** DGCA publishes total fares (base + taxes). Our index tracks base fares only using T+7 advance window. Differences within 5 index points confirm our methodology accurately captures real market price movements.

---

## 🚀 Setup & Installation

### Prerequisites
- Python 3.11+
- Node.js 18+
- Git

### Local Development

**1. Clone the repository**
```bash
git clone https://github.com/yourusername/apix-india.git
cd apix-india
```

**2. Create virtual environment**
```bash
python -m venv venv
venv\Scripts\activate      # Windows
source venv/bin/activate   # Mac/Linux
```

**3. Install dependencies**
```bash
pip install -r requirements.txt
playwright install chromium
```

**4. Set up environment variables**
```bash
# Create .env file
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
```

**5. Run scraper (single route test)**
```bash
python scraper/run_scraper.py DEL BOM
```

**6. Calculate index**
```bash
python index/calculate_index.py
```

**7. Start API server**
```bash
uvicorn backend.main:app --reload --port 8000
```

**8. Start dashboard**
```bash
cd frontend
npm install
npm run dev
```

### Run Back-test Validation
```bash
python index/backtest.py
```

---

## 📁 Project Structure


apix-india/
├── scraper/
│ ├── sites/
│ │ └── google_flights.py ← main scraper
│ ├── routes.py ← route basket + weights
│ ├── cleaner.py ← data cleaning pipeline
│ ├── database.py ← local SQLite operations
│ └── run_scraper.py ← master scraper script
│
├── index/
│ ├── calculate_index.py ← APIx computation
│ └── backtest.py ← DGCA validation
│
├── backend/
│ ├── main.py ← FastAPI endpoints
│ └── database.py ← Supabase HTTP client
│
├── frontend/
│ └── src/
│ ├── App.jsx ← main dashboard
│ └── api.js ← API connector
│
├── data/
│ ├── dgca_reference.json ← DGCA validation data
│ ├── base_period.json ← index base fares
│ └── backtest_results.json ← validation results
│
├── .github/
│ └── workflows/
│ └── daily_scrape.yml ← GitHub Actions automation
│
├── requirements.txt ← Python dependencies
├── runtime.txt ← Python 3.11 for Render
└── README.md ← this file



---

## 🔒 Ethical Scraping

This system is designed with ethical scraping principles:

- ✅ Respects `robots.txt` of all source websites
- ✅ Rate limiting — 8 second delay between requests
- ✅ Randomized user agents to avoid server overload
- ✅ Scrapes only publicly visible fare data
- ✅ No login bypass or authentication circumvention
- ✅ Data used solely for statistical price index computation

---

## 🗓️ Automation Schedule

| Task | Schedule | Platform |
|---|---|---|
| Fare scraping | Daily 11:30 PM IST | GitHub Actions |
| Index calculation | Daily after scraping | GitHub Actions |
| Dashboard update | Real-time via API | Vercel + Render |

---

## 👥 Team

**Smart India Hackathon 2026**
Problem Statement: SIH26056
Organization: MoSPI — Ministry of Statistics & Programme Implementation

---

## 📜 License

MIT License — free to use for educational and research purposes.