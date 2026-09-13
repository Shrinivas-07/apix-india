// frontend/src/App.jsx
import { useState, useEffect } from "react"
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from "recharts"
import {
  fetchLatestIndex,
  fetchIndexHistory,
  fetchRoutes,
  fetchRouteDetail,
  fetchStats,
} from "./api"

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => n?.toLocaleString("en-IN") ?? "—"
const pct = (n) => n > 0 ? `+${n}%` : `${n}%`

function heatColor(chg) {
  if (chg > 10)  return "#fee2e2"
  if (chg > 0)   return "#fef9c3"
  if (chg < -5)  return "#dcfce7"
  return "#f1f5f9"
}

function heatTextColor(chg) {
  if (chg > 10)  return "#991b1b"
  if (chg > 0)   return "#854d0e"
  if (chg < -5)  return "#166534"
  return "#334155"
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, up }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 12, padding: "16px 20px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.08)", flex: 1, minWidth: 140
    }}>
      <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase",
                    letterSpacing: "0.06em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 600, color: "#0f172a" }}>{value}</div>
      {sub && (
        <div style={{ fontSize: 12, marginTop: 4,
                      color: up === true ? "#dc2626" : up === false ? "#16a34a" : "#64748b" }}>
          {sub}
        </div>
      )}
    </div>
  )
}

// ── Tab Button ────────────────────────────────────────────────────────────────
function Tab({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer",
      fontSize: 13, fontWeight: 500,
      background: active ? "#1d4ed8" : "#f1f5f9",
      color: active ? "#fff" : "#475569",
      transition: "all 0.15s",
    }}>{label}</button>
  )
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab]           = useState("national")
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  // Data states
  const [latest, setLatest]     = useState(null)
  const [history, setHistory]   = useState([])
  const [routes, setRoutes]     = useState([])
  const [stats, setStats]       = useState(null)

  // Route drill-down states
  const [selRoute, setSelRoute] = useState("DEL-BOM")
  const [routeDetail, setRouteDetail] = useState(null)
  const [routeLoading, setRouteLoading] = useState(false)

  // ── Load all data on mount ──────────────────────────────────────────────────
  useEffect(() => {
    async function loadAll() {
      try {
        setLoading(true)
        const [l, h, r, s] = await Promise.all([
          fetchLatestIndex(),
          fetchIndexHistory(30),
          fetchRoutes(),
          fetchStats(),
        ])
        setLatest(l)
        setHistory(h.history || [])
        setRoutes(r.routes || [])
        setStats(s.stats || {})
      } catch (e) {
        setError("Could not load data. Make sure the API is running.")
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    loadAll()
  }, [])

  // ── Load route detail when selection changes ────────────────────────────────
  useEffect(() => {
    if (tab !== "route") return
    const [o, d] = selRoute.split("-")
    setRouteLoading(true)
    fetchRouteDetail(o, d)
      .then(setRouteDetail)
      .catch(() => setRouteDetail(null))
      .finally(() => setRouteLoading(false))
  }, [selRoute, tab])

  // ── Loading / Error screens ─────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
                  height: "100vh", fontFamily: "system-ui",
                  flexDirection: "column", gap: 12, color: "#64748b" }}>
      <div style={{ fontSize: 32 }}>✈️</div>
      <div style={{ fontSize: 16 }}>Loading APIx data...</div>
      <div style={{ fontSize: 12 }}>Connecting to live database</div>
    </div>
  )

  if (error) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
                  height: "100vh", fontFamily: "system-ui",
                  flexDirection: "column", gap: 12, color: "#dc2626" }}>
      <div style={{ fontSize: 32 }}>⚠️</div>
      <div style={{ fontSize: 16 }}>{error}</div>
      <button onClick={() => window.location.reload()}
              style={{ padding: "8px 20px", borderRadius: 8, border: "none",
                       background: "#1d4ed8", color: "#fff", cursor: "pointer" }}>
        Retry
      </button>
    </div>
  )

  const apix = latest?.apix_value ?? 100
  const apixChange = (apix - 100).toFixed(1)

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", background: "#f8fafc",
                  minHeight: "100vh", padding: "0 0 40px" }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ background: "#1e3a5f", color: "#fff",
                    padding: "16px 32px", display: "flex",
                    alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>
            🇮🇳 Airfare Price Index (APIx) — India
          </div>
          <div style={{ fontSize: 12, color: "#93c5fd", marginTop: 2 }}>
            Real-time airfare tracking · {stats?.total_fare_records?.toLocaleString() ?? "—"} fare records ·{" "}
            {routes.length} routes tracked
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: "#93c5fd" }}>Last updated</div>
          <div style={{ fontSize: 13 }}>
            {latest?.index_date ?? "—"}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 20px" }}>

        {/* ── KPI Row ──────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          <KpiCard
            label="National APIx"
            value={apix.toFixed(1)}
            sub={`${apixChange > 0 ? "+" : ""}${apixChange} vs base period`}
            up={apixChange > 0}
          />
          <KpiCard
            label="Routes Tracked"
            value={latest?.routes_used ?? "—"}
            sub="weighted by DGCA traffic"
          />
          <KpiCard
            label="Fare Records"
            value={stats?.total_fare_records?.toLocaleString() ?? "—"}
            sub="in database"
          />
          <KpiCard
            label="Base Period"
            value={latest?.base_period ?? "—"}
            sub="index = 100 on this date"
          />
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <Tab label="National APIx"   active={tab === "national"} onClick={() => setTab("national")} />
          <Tab label="Route Heatmap"   active={tab === "heatmap"}  onClick={() => setTab("heatmap")} />
          <Tab label="Route Drill-down" active={tab === "route"}   onClick={() => setTab("route")} />
        </div>

        {/* ── Tab: National APIx ───────────────────────────────────────────── */}
        {tab === "national" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ background: "#fff", borderRadius: 12, padding: 24,
                          boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
                APIx — 30 Day Trend
              </div>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>
                Passenger-weighted index across all tracked routes · Base = 100
              </div>
              {history.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="index_date" tick={{ fontSize: 11 }}
                           tickFormatter={d => d?.slice(5)} />
                    <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(v) => [v?.toFixed(2), "APIx"]}
                      labelFormatter={(l) => `Date: ${l}`}
                    />
                    <Line type="monotone" dataKey="apix_value" stroke="#1d4ed8"
                          strokeWidth={2} dot={false} name="APIx" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 280, display: "flex", alignItems: "center",
                              justifyContent: "center", color: "#94a3b8" }}>
                  No history data yet — run the scraper for multiple days to see trend
                </div>
              )}
            </div>

            {/* Route weights bar chart */}
            <div style={{ background: "#fff", borderRadius: 12, padding: 24,
                          boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
                Route Weight Distribution
              </div>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>
                How much each route influences the national index (DGCA passenger share)
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={routes} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11 }}
                         tickFormatter={v => `${v}%`} />
                  <YAxis type="category" dataKey="route" width={80}
                         tick={{ fontSize: 11 }} />
                  <Tooltip formatter={v => [`${v}%`, "Weight"]} />
                  <Bar dataKey="weight" fill="#1d4ed8" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── Tab: Route Heatmap ───────────────────────────────────────────── */}
        {tab === "heatmap" && (
          <div style={{ background: "#fff", borderRadius: 12, padding: 24,
                        boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
              Sector Heatmap
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 20 }}>
              Average base fare vs previous 7 days · Red = more expensive · Green = cheaper
            </div>
            <div style={{ display: "grid",
                          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                          gap: 12 }}>
              {routes.map(r => (
                <div key={r.route}
                     onClick={() => { setSelRoute(r.route); setTab("route") }}
                     style={{
                       background: heatColor(r.change_pct),
                       borderRadius: 10, padding: "14px 16px", cursor: "pointer",
                       transition: "transform 0.1s",
                     }}
                     onMouseEnter={e => e.currentTarget.style.transform = "scale(1.02)"}
                     onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                >
                  <div style={{ fontSize: 13, fontWeight: 700,
                                color: heatTextColor(r.change_pct) }}>
                    {r.route}
                  </div>
                  <div style={{ fontSize: 11, color: heatTextColor(r.change_pct),
                                marginTop: 2 }}>
                    {r.name}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 600, marginTop: 8,
                                color: heatTextColor(r.change_pct) }}>
                    ₹{fmt(r.avg_fare)}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 4,
                                color: heatTextColor(r.change_pct) }}>
                    {r.change_pct > 0 ? "▲" : r.change_pct < 0 ? "▼" : "●"}{" "}
                    {pct(r.change_pct)} vs last week
                  </div>
                  <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4 }}>
                    Weight: {r.weight}% · Click to drill down
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Tab: Route Drill-down ────────────────────────────────────────── */}
        {tab === "route" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Route selector */}
            <div style={{ display: "flex", gap: 12, alignItems: "center",
                          flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: "#64748b" }}>Select route:</span>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {routes.map(r => (
                  <button key={r.route}
                          onClick={() => setSelRoute(r.route)}
                          style={{
                            padding: "6px 14px", borderRadius: 8, border: "none",
                            cursor: "pointer", fontSize: 12, fontWeight: 500,
                            background: selRoute === r.route ? "#1d4ed8" : "#f1f5f9",
                            color: selRoute === r.route ? "#fff" : "#475569",
                          }}>
                    {r.route}
                  </button>
                ))}
              </div>
            </div>

            {routeLoading ? (
              <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>
                Loading route data...
              </div>
            ) : routeDetail ? (
              <>
                {/* Lead time curve */}
                <div style={{ background: "#fff", borderRadius: 12, padding: 24,
                              boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
                  <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
                    {routeDetail.name} — Lead-time Elasticity
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>
                    How average base fare changes with advance booking window
                  </div>
                  {routeDetail.lead_time_curve?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <LineChart data={routeDetail.lead_time_curve}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="advance_days"
                               tickFormatter={v => `T+${v}`}
                               tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }}
                               tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                        <Tooltip
                          formatter={(v) => [`₹${fmt(v)}`, "Avg base fare"]}
                          labelFormatter={(l) => `T+${l} days advance`}
                        />
                        <Line type="monotone" dataKey="avg_fare" stroke="#1d4ed8"
                              strokeWidth={2} dot={{ r: 5, fill: "#1d4ed8" }} />
                        <Line type="monotone" dataKey="min_fare" stroke="#16a34a"
                              strokeWidth={1} strokeDasharray="4 4" dot={false}
                              name="Min fare" />
                        <Line type="monotone" dataKey="max_fare" stroke="#dc2626"
                              strokeWidth={1} strokeDasharray="4 4" dot={false}
                              name="Max fare" />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ height: 240, display: "flex", alignItems: "center",
                                  justifyContent: "center", color: "#94a3b8" }}>
                      No lead-time data yet for this route
                    </div>
                  )}
                </div>

                {/* Carrier comparison */}
                {routeDetail.carrier_summary?.length > 0 && (
                  <div style={{ background: "#fff", borderRadius: 12, padding: 24,
                                boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
                    <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
                      Carrier Comparison — {routeDetail.name}
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>
                      Average base fare by carrier (last 7 days)
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={routeDetail.carrier_summary}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="carrier" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }}
                               tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                        <Tooltip formatter={v => [`₹${fmt(v)}`, "Avg base fare"]} />
                        <Bar dataKey="avg_fare" fill="#0891b2" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Route stats */}
                <div style={{ background: "#fff", borderRadius: 12, padding: 20,
                              boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                              display: "flex", gap: 32, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 11, color: "#64748b",
                                  textTransform: "uppercase" }}>Route</div>
                    <div style={{ fontSize: 18, fontWeight: 600 }}>{routeDetail.route}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "#64748b",
                                  textTransform: "uppercase" }}>Index weight</div>
                    <div style={{ fontSize: 18, fontWeight: 600 }}>{routeDetail.weight}%</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "#64748b",
                                  textTransform: "uppercase" }}>Fares collected</div>
                    <div style={{ fontSize: 18, fontWeight: 600 }}>
                      {routeDetail.recent_count}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>
                No data for this route yet
              </div>
            )}
          </div>
        )}

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <div style={{ marginTop: 40, textAlign: "center", fontSize: 11,
                      color: "#94a3b8" }}>
          APIx — India Airfare Price Index · Built for MoSPI/NSO ·
          Data from Google Flights · Index methodology: Laspeyres weighted average
        </div>
      </div>
    </div>
  )
}