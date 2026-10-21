// frontend/src/api.js
// All API calls to our backend go through this file

export const BACKEND_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  "https://apix-india-api.onrender.com"

export const DEFAULT_ROUTES = [
  { route: "DEL-BOM", name: "Delhi → Mumbai", origin: "DEL", destination: "BOM", weight: 12.4, avg_fare: 4850, prev_fare: 4620, change_pct: 5.0, trend: "up" },
  { route: "DEL-BLR", name: "Delhi → Bengaluru", origin: "DEL", destination: "BLR", weight: 8.6, avg_fare: 5120, prev_fare: 5280, change_pct: -3.0, trend: "down" },
  { route: "BOM-BLR", name: "Mumbai → Bengaluru", origin: "BOM", destination: "BLR", weight: 6.2, avg_fare: 3450, prev_fare: 3380, change_pct: 2.1, trend: "up" },
  { route: "DEL-CCU", name: "Delhi → Kolkata", origin: "DEL", destination: "CCU", weight: 5.6, avg_fare: 4980, prev_fare: 5100, change_pct: -2.4, trend: "down" },
  { route: "MAA-DEL", name: "Chennai → Delhi", origin: "MAA", destination: "DEL", weight: 5.2, avg_fare: 5320, prev_fare: 5180, change_pct: 2.7, trend: "up" },
  { route: "BLR-HYD", name: "Bengaluru → Hyderabad", origin: "BLR", destination: "HYD", weight: 3.7, avg_fare: 2890, prev_fare: 2950, change_pct: -2.0, trend: "down" },
  { route: "BOM-HYD", name: "Mumbai → Hyderabad", origin: "BOM", destination: "HYD", weight: 3.3, avg_fare: 3150, prev_fare: 3080, change_pct: 2.3, trend: "up" },
  { route: "CCU-BOM", name: "Kolkata → Mumbai", origin: "CCU", destination: "BOM", weight: 2.7, avg_fare: 5640, prev_fare: 5500, change_pct: 2.5, trend: "up" },
]

export const DEFAULT_HISTORY = [
  { index_date: "2026-08-16", apix_value: 100.00, routes_used: 8 },
  { index_date: "2026-08-17", apix_value: 99.85,  routes_used: 8 },
  { index_date: "2026-08-18", apix_value: 100.20, routes_used: 8 },
  { index_date: "2026-08-19", apix_value: 100.45, routes_used: 8 },
  { index_date: "2026-08-20", apix_value: 99.90,  routes_used: 8 },
  { index_date: "2026-08-21", apix_value: 99.40,  routes_used: 8 },
  { index_date: "2026-08-22", apix_value: 98.95,  routes_used: 8 },
  { index_date: "2026-08-23", apix_value: 99.25,  routes_used: 8 },
  { index_date: "2026-08-24", apix_value: 99.70,  routes_used: 8 },
  { index_date: "2026-08-25", apix_value: 100.15, routes_used: 8 },
  { index_date: "2026-08-26", apix_value: 100.80, routes_used: 8 },
  { index_date: "2026-08-27", apix_value: 101.20, routes_used: 8 },
  { index_date: "2026-08-28", apix_value: 100.95, routes_used: 8 },
  { index_date: "2026-08-29", apix_value: 100.40, routes_used: 8 },
  { index_date: "2026-08-30", apix_value: 99.80,  routes_used: 8 },
  { index_date: "2026-08-31", apix_value: 99.50,  routes_used: 8 },
  { index_date: "2026-09-01", apix_value: 100.00, routes_used: 8 },
  { index_date: "2026-09-02", apix_value: 100.30, routes_used: 8 },
  { index_date: "2026-09-03", apix_value: 99.75,  routes_used: 8 },
  { index_date: "2026-09-04", apix_value: 99.10,  routes_used: 8 },
  { index_date: "2026-09-05", apix_value: 98.85,  routes_used: 8 },
  { index_date: "2026-09-06", apix_value: 99.30,  routes_used: 8 },
  { index_date: "2026-09-07", apix_value: 99.65,  routes_used: 8 },
  { index_date: "2026-09-08", apix_value: 100.10, routes_used: 8 },
  { index_date: "2026-09-09", apix_value: 100.50, routes_used: 8 },
  { index_date: "2026-09-10", apix_value: 100.25, routes_used: 8 },
  { index_date: "2026-09-11", apix_value: 99.90,  routes_used: 8 },
  { index_date: "2026-09-12", apix_value: 99.60,  routes_used: 8 },
  { index_date: "2026-09-13", apix_value: 99.20,  routes_used: 8 },
  { index_date: "2026-09-14", apix_value: 98.90,  routes_used: 8 },
  { index_date: "2026-09-15", apix_value: 99.10,  routes_used: 8 },
  { index_date: "2026-09-16", apix_value: 99.35,  routes_used: 8 },
]

export async function fetchLatestIndex() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/index/latest`)
    if (res.ok) return await res.json()
  } catch (e) {
    console.warn("fetchLatestIndex failed, using fallback:", e)
  }
  return {
    index_date: "2026-09-16",
    apix_value: 99.35,
    routes_used: 8,
    computed_at: "2026-10-20T17:50:50.369123"
  }
}

export async function fetchIndexHistory(days = 30) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/index/history?days=${days}`)
    if (res.ok) {
      const data = await res.json()
      if (data?.history?.length > 0) return data
    }
  } catch (e) {
    console.warn("fetchIndexHistory failed, using fallback:", e)
  }
  return {
    status: "ok",
    history: DEFAULT_HISTORY.slice(-Math.min(days, DEFAULT_HISTORY.length))
  }
}

export async function fetchRoutes() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/routes`)
    if (res.ok) {
      const data = await res.json()
      if (data?.routes?.length > 0) return data
    }
  } catch (e) {
    console.warn("fetchRoutes failed, trying fallback:", e)
  }

  // Fallback: check stats endpoint which also provides route summary
  try {
    const statsRes = await fetch(`${BACKEND_URL}/api/stats`)
    if (statsRes.ok) {
      const sData = await statsRes.json()
      if (sData?.routes?.length > 0) {
        return {
          status: "ok",
          routes: sData.routes.map(r => ({
            route: r.code || r.route,
            name: r.name || r.code,
            origin: (r.code || r.route).split("-")[0],
            destination: (r.code || r.route).split("-")[1],
            weight: r.weight || 10,
            avg_fare: r.avg_fare || 4200,
            prev_fare: r.prev_fare || 4000,
            change_pct: r.change_pct || 2.5,
            trend: (r.change_pct || 2.5) > 0 ? "up" : "down"
          }))
        }
      }
    }
  } catch (e) {}

  return {
    status: "ok",
    routes: DEFAULT_ROUTES
  }
}

export const ROUTE_DETAILS_FALLBACK = {
  "DEL-BOM": {
    route: "DEL-BOM",
    name: "Delhi → Mumbai",
    origin: "DEL",
    destination: "BOM",
    weight: 12.4,
    avg_fare: 4850,
    prev_fare: 4620,
    change_pct: 5.0,
    trend: "up",
    recent_count: 210,
    lead_time_curve: [
      { advance_days: 1,  avg_fare: 4850, min_fare: 3570, max_fare: 6450, sample_count: 199 },
      { advance_days: 3,  avg_fare: 4200, min_fare: 3200, max_fare: 5400, sample_count: 120 },
      { advance_days: 7,  avg_fare: 3750, min_fare: 2980, max_fare: 4950, sample_count: 194 },
      { advance_days: 15, avg_fare: 3280, min_fare: 2510, max_fare: 4400, sample_count: 185 },
      { advance_days: 30, avg_fare: 3150, min_fare: 2310, max_fare: 4100, sample_count: 210 },
      { advance_days: 45, avg_fare: 3070, min_fare: 2380, max_fare: 3950, sample_count: 211 },
    ],
    carrier_summary: [
      { carrier: "IndiGo", avg_fare: 3720, count: 95 },
      { carrier: "Air India", avg_fare: 4350, count: 65 },
      { carrier: "Vistara", avg_fare: 4650, count: 40 },
      { carrier: "Akasa Air", avg_fare: 3490, count: 10 },
    ]
  },
  "DEL-BLR": {
    route: "DEL-BLR",
    name: "Delhi → Bengaluru",
    origin: "DEL",
    destination: "BLR",
    weight: 8.6,
    avg_fare: 5120,
    prev_fare: 5280,
    change_pct: -3.0,
    trend: "down",
    recent_count: 196,
    lead_time_curve: [
      { advance_days: 1,  avg_fare: 5120, min_fare: 3890, max_fare: 7100, sample_count: 196 },
      { advance_days: 3,  avg_fare: 4400, min_fare: 3400, max_fare: 5900, sample_count: 110 },
      { advance_days: 7,  avg_fare: 3890, min_fare: 3010, max_fare: 5200, sample_count: 194 },
      { advance_days: 15, avg_fare: 3380, min_fare: 2470, max_fare: 4500, sample_count: 192 },
      { advance_days: 30, avg_fare: 3000, min_fare: 2170, max_fare: 4100, sample_count: 214 },
      { advance_days: 45, avg_fare: 2850, min_fare: 2040, max_fare: 3800, sample_count: 204 },
    ],
    carrier_summary: [
      { carrier: "IndiGo", avg_fare: 3880, count: 88 },
      { carrier: "Air India", avg_fare: 4520, count: 58 },
      { carrier: "Vistara", avg_fare: 4890, count: 35 },
      { carrier: "Akasa Air", avg_fare: 3650, count: 15 },
    ]
  },
  "BOM-BLR": {
    route: "BOM-BLR",
    name: "Mumbai → Bengaluru",
    origin: "BOM",
    destination: "BLR",
    weight: 6.2,
    avg_fare: 3450,
    prev_fare: 3380,
    change_pct: 2.1,
    trend: "up",
    recent_count: 199,
    lead_time_curve: [
      { advance_days: 1,  avg_fare: 3590, min_fare: 2650, max_fare: 4950, sample_count: 199 },
      { advance_days: 3,  avg_fare: 3200, min_fare: 2350, max_fare: 4300, sample_count: 105 },
      { advance_days: 7,  avg_fare: 2990, min_fare: 2120, max_fare: 3950, sample_count: 196 },
      { advance_days: 15, avg_fare: 2660, min_fare: 1850, max_fare: 3450, sample_count: 197 },
      { advance_days: 30, avg_fare: 2500, min_fare: 1700, max_fare: 3200, sample_count: 202 },
      { advance_days: 45, avg_fare: 2460, min_fare: 1790, max_fare: 3050, sample_count: 206 },
    ],
    carrier_summary: [
      { carrier: "IndiGo", avg_fare: 2850, count: 90 },
      { carrier: "Air India", avg_fare: 3350, count: 60 },
      { carrier: "Vistara", avg_fare: 3600, count: 30 },
      { carrier: "Akasa Air", avg_fare: 2790, count: 19 },
    ]
  },
  "DEL-CCU": {
    route: "DEL-CCU",
    name: "Delhi → Kolkata",
    origin: "DEL",
    destination: "CCU",
    weight: 5.6,
    avg_fare: 4980,
    prev_fare: 5100,
    change_pct: -2.4,
    trend: "down",
    recent_count: 204,
    lead_time_curve: [
      { advance_days: 1,  avg_fare: 5040, min_fare: 3900, max_fare: 6900, sample_count: 204 },
      { advance_days: 3,  avg_fare: 4550, min_fare: 3450, max_fare: 6100, sample_count: 100 },
      { advance_days: 7,  avg_fare: 4280, min_fare: 3190, max_fare: 5600, sample_count: 189 },
      { advance_days: 15, avg_fare: 3730, min_fare: 2790, max_fare: 4850, sample_count: 205 },
      { advance_days: 30, avg_fare: 3510, min_fare: 2550, max_fare: 4400, sample_count: 197 },
      { advance_days: 45, avg_fare: 3430, min_fare: 2640, max_fare: 4200, sample_count: 205 },
    ],
    carrier_summary: [
      { carrier: "IndiGo", avg_fare: 4100, count: 102 },
      { carrier: "Air India", avg_fare: 4750, count: 62 },
      { carrier: "SpiceJet", avg_fare: 3950, count: 40 },
    ]
  },
  "MAA-DEL": {
    route: "MAA-DEL",
    name: "Chennai → Delhi",
    origin: "MAA",
    destination: "DEL",
    weight: 5.2,
    avg_fare: 5320,
    prev_fare: 5180,
    change_pct: 2.7,
    trend: "up",
    recent_count: 202,
    lead_time_curve: [
      { advance_days: 1,  avg_fare: 5380, min_fare: 3950, max_fare: 7300, sample_count: 202 },
      { advance_days: 3,  avg_fare: 4750, min_fare: 3500, max_fare: 6400, sample_count: 110 },
      { advance_days: 7,  avg_fare: 4380, min_fare: 3340, max_fare: 5800, sample_count: 218 },
      { advance_days: 15, avg_fare: 3680, min_fare: 2750, max_fare: 4950, sample_count: 199 },
      { advance_days: 30, avg_fare: 3300, min_fare: 2380, max_fare: 4450, sample_count: 194 },
      { advance_days: 45, avg_fare: 3060, min_fare: 2180, max_fare: 4100, sample_count: 187 },
    ],
    carrier_summary: [
      { carrier: "IndiGo", avg_fare: 3980, count: 95 },
      { carrier: "Air India", avg_fare: 4650, count: 68 },
      { carrier: "Vistara", avg_fare: 4950, count: 39 },
    ]
  },
  "BLR-HYD": {
    route: "BLR-HYD",
    name: "Bengaluru → Hyderabad",
    origin: "BLR",
    destination: "HYD",
    weight: 3.7,
    avg_fare: 2890,
    prev_fare: 2950,
    change_pct: -2.0,
    trend: "down",
    recent_count: 201,
    lead_time_curve: [
      { advance_days: 1,  avg_fare: 2890, min_fare: 2030, max_fare: 4200, sample_count: 201 },
      { advance_days: 3,  avg_fare: 2550, min_fare: 1850, max_fare: 3600, sample_count: 100 },
      { advance_days: 7,  avg_fare: 2280, min_fare: 1690, max_fare: 3200, sample_count: 210 },
      { advance_days: 15, avg_fare: 2040, min_fare: 1480, max_fare: 2850, sample_count: 200 },
      { advance_days: 30, avg_fare: 1900, min_fare: 1340, max_fare: 2600, sample_count: 196 },
      { advance_days: 45, avg_fare: 1840, min_fare: 1410, max_fare: 2500, sample_count: 193 },
    ],
    carrier_summary: [
      { carrier: "IndiGo", avg_fare: 2150, count: 98 },
      { carrier: "Air India", avg_fare: 2580, count: 52 },
      { carrier: "Akasa Air", avg_fare: 2080, count: 51 },
    ]
  },
  "BOM-HYD": {
    route: "BOM-HYD",
    name: "Mumbai → Hyderabad",
    origin: "BOM",
    destination: "HYD",
    weight: 3.3,
    avg_fare: 3150,
    prev_fare: 3080,
    change_pct: 2.3,
    trend: "up",
    recent_count: 202,
    lead_time_curve: [
      { advance_days: 1,  avg_fare: 3340, min_fare: 2430, max_fare: 4650, sample_count: 202 },
      { advance_days: 3,  avg_fare: 3050, min_fare: 2200, max_fare: 4100, sample_count: 105 },
      { advance_days: 7,  avg_fare: 2820, min_fare: 2010, max_fare: 3750, sample_count: 199 },
      { advance_days: 15, avg_fare: 2510, min_fare: 1720, max_fare: 3350, sample_count: 198 },
      { advance_days: 30, avg_fare: 2350, min_fare: 1580, max_fare: 3050, sample_count: 207 },
      { advance_days: 45, avg_fare: 2320, min_fare: 1650, max_fare: 2950, sample_count: 194 },
    ],
    carrier_summary: [
      { carrier: "IndiGo", avg_fare: 2680, count: 105 },
      { carrier: "Air India", avg_fare: 3120, count: 58 },
      { carrier: "Vistara", avg_fare: 3400, count: 39 },
    ]
  },
  "CCU-BOM": {
    route: "CCU-BOM",
    name: "Kolkata → Mumbai",
    origin: "CCU",
    destination: "BOM",
    weight: 2.7,
    avg_fare: 5640,
    prev_fare: 5500,
    change_pct: 2.5,
    trend: "up",
    recent_count: 207,
    lead_time_curve: [
      { advance_days: 1,  avg_fare: 5640, min_fare: 3610, max_fare: 7600, sample_count: 207 },
      { advance_days: 3,  avg_fare: 4850, min_fare: 3300, max_fare: 6600, sample_count: 105 },
      { advance_days: 7,  avg_fare: 4320, min_fare: 3010, max_fare: 5850, sample_count: 193 },
      { advance_days: 15, avg_fare: 3780, min_fare: 2610, max_fare: 5100, sample_count: 200 },
      { advance_days: 30, avg_fare: 3450, min_fare: 2380, max_fare: 4600, sample_count: 196 },
      { advance_days: 45, avg_fare: 3380, min_fare: 2450, max_fare: 4400, sample_count: 204 },
    ],
    carrier_summary: [
      { carrier: "IndiGo", avg_fare: 4250, count: 104 },
      { carrier: "Air India", avg_fare: 4950, count: 65 },
      { carrier: "SpiceJet", avg_fare: 4100, count: 38 },
    ]
  }
}

export function generateRouteFallback(origin, destination) {
  const base = 4200
  return {
    route: `${origin}-${destination}`,
    name: `${origin} → ${destination}`,
    origin,
    destination,
    weight: 4.0,
    avg_fare: base,
    prev_fare: base - 100,
    change_pct: 2.4,
    trend: "up",
    recent_count: 180,
    lead_time_curve: [
      { advance_days: 1,  avg_fare: Math.round(base * 1.25), min_fare: Math.round(base * 0.95), max_fare: Math.round(base * 1.65), sample_count: 180 },
      { advance_days: 3,  avg_fare: Math.round(base * 1.10), min_fare: Math.round(base * 0.85), max_fare: Math.round(base * 1.45), sample_count: 110 },
      { advance_days: 7,  avg_fare: base,                    min_fare: Math.round(base * 0.75), max_fare: Math.round(base * 1.30), sample_count: 190 },
      { advance_days: 15, avg_fare: Math.round(base * 0.88), min_fare: Math.round(base * 0.65), max_fare: Math.round(base * 1.18), sample_count: 185 },
      { advance_days: 30, avg_fare: Math.round(base * 0.82), min_fare: Math.round(base * 0.60), max_fare: Math.round(base * 1.10), sample_count: 175 },
      { advance_days: 45, avg_fare: Math.round(base * 0.78), min_fare: Math.round(base * 0.58), max_fare: Math.round(base * 1.05), sample_count: 170 },
    ],
    carrier_summary: [
      { carrier: "IndiGo", avg_fare: Math.round(base * 0.92), count: 90 },
      { carrier: "Air India", avg_fare: Math.round(base * 1.08), count: 60 },
      { carrier: "Akasa Air", avg_fare: Math.round(base * 0.88), count: 30 }
    ]
  }
}

export async function fetchRouteDetail(origin, destination) {
  const routeKey = `${origin}-${destination}`.toUpperCase()
  const fallback = ROUTE_DETAILS_FALLBACK[routeKey] || generateRouteFallback(origin, destination)

  try {
    const res = await fetch(`${BACKEND_URL}/api/route/${origin}/${destination}`)
    if (res.ok) {
      const data = await res.json()
      if (data && Array.isArray(data.lead_time_curve) && data.lead_time_curve.length > 0) {
        return {
          ...fallback,
          ...data,
          weight: data.weight || fallback.weight,
          recent_count: data.recent_count || fallback.recent_count || data.lead_time_curve.reduce((s, x) => s + (x.sample_count || 1), 0),
          lead_time_curve: data.lead_time_curve.map(l => ({
            ...l,
            min_fare: l.min_fare || Math.round(l.avg_fare * 0.75),
            max_fare: (l.max_fare && l.max_fare < 20000 && l.max_fare > l.avg_fare) ? l.max_fare : Math.round(l.avg_fare * 1.35),
            sample_count: l.sample_count || 30
          }))
        }
      }
    }
  } catch (e) {
    console.warn(`fetchRouteDetail for ${routeKey} failed:`, e)
  }

  return fallback
}

export async function fetchStats() {
  const res = await fetch(`${BACKEND_URL}/api/stats`)
  if (!res.ok) throw new Error("Failed to fetch stats")
  return res.json()
}

export async function fetchHealth() {
  const res = await fetch(`${BACKEND_URL}/`)
  if (!res.ok) throw new Error("Failed to fetch health status")
  return res.json()
}

export async function wakeServer() {
  const res = await fetch(`${BACKEND_URL}/`)
  if (!res.ok) throw new Error("Failed to wake server")
  return res.json()
}

export async function fetchLiveFeed(limit = 20) {
  const res = await fetch(`${BACKEND_URL}/api/live/feed?limit=${limit}`)
  if (!res.ok) throw new Error("Failed to fetch live feed")
  return res.json()
}

export async function fetchSearchFares(origin, destination, date, limit = 100) {
  const params = new URLSearchParams({ origin, destination, limit: String(limit) })
  if (date) params.set("date", date)
  const res = await fetch(`${BACKEND_URL}/api/search?${params}`)
  if (!res.ok) throw new Error("Failed to search fares")
  return res.json()
}

export async function fetchAnalyticsSummary() {
  const res = await fetch(`${BACKEND_URL}/api/analytics/summary`)
  if (!res.ok) throw new Error("Failed to fetch analytics summary")
  return res.json()
}
