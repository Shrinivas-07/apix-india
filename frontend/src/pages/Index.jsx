// src/pages/Index.jsx
import { useState, useEffect } from "react"
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, ComposedChart, Cell
} from "recharts"
import GlassCard  from "../components/GlassCard"
import StatCard   from "../components/StatCard"
import LiveBadge  from "../components/LiveBadge"
import Skeleton   from "../components/Skeleton"
import { fetchLatestIndex, fetchIndexHistory, fetchRoutes, DEFAULT_ROUTES, DEFAULT_HISTORY } from "../api"
import { colors, glass, gradients } from "../styles/theme"

// ── Time range buttons ────────────────────────────────────────────────────────
const RANGES = [
  { label: "1W",  days: 7  },
  { label: "1M",  days: 30 },
  { label: "3M",  days: 90 },
  { label: "6M",  days: 180 },
  { label: "All", days: 365 },
]

// ── Custom tooltip ────────────────────────────────────────────────────────────
function IndexTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const val = payload[0]?.value
  return (
    <div style={{
      ...glass.strong, padding: "14px 18px",
      borderRadius: 14, minWidth: 180,
    }}>
      <div style={{ fontSize: 11, color: colors.textMuted,
                    marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800,
                    color: colors.textPrimary }}>
        {val?.toFixed(2)}
      </div>
      <div style={{ fontSize: 12, marginTop: 6,
                    color: val > 100 ? colors.red : colors.green }}>
        {val > 100
          ? `▲ ${(val - 100).toFixed(1)} pts above base`
          : `▼ ${(100 - val).toFixed(1)} pts below base`}
      </div>
      {payload[1]?.value && (
        <div style={{ fontSize: 11, color: colors.textMuted,
                      marginTop: 4, paddingTop: 8,
                      borderTop: `1px solid ${colors.border}` }}>
          Last period: {payload[1].value?.toFixed(2)}
        </div>
      )}
    </div>
  )
}

// ── Decomposition bar tooltip ─────────────────────────────────────────────────
function DecompTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      ...glass.strong, padding: "12px 16px", borderRadius: 12
    }}>
      <div style={{ fontSize: 13, fontWeight: 700,
                    color: colors.textPrimary, marginBottom: 8 }}>
        {label}
      </div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize: 12, color: p.color,
                               display: "flex", justifyContent: "space-between",
                               gap: 16, marginBottom: 4 }}>
          <span>{p.name}</span>
          <span style={{ fontWeight: 600 }}>{p.value?.toFixed(2)}</span>
        </div>
      ))}
    </div>
  )
}

// ── Range button ──────────────────────────────────────────────────────────────
function RangeBtn({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "6px 14px", borderRadius: 8,
      border: "none", cursor: "pointer",
      fontSize: 12, fontWeight: 600,
      background: active
        ? "linear-gradient(135deg, #3b82f6, #1d4ed8)"
        : "rgba(255,255,255,0.05)",
      color: active ? "#fff" : colors.textSecondary,
      boxShadow: active ? "0 4px 12px rgba(59,130,246,0.3)" : "none",
      transition: "all 0.15s",
    }}>
      {label}
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function IndexPage() {
  const [loading,  setLoading]  = useState(true)
  const [latest,   setLatest]   = useState(null)
  const [history,  setHistory]  = useState([])
  const [routes,   setRoutes]   = useState([])
  const [range,    setRange]    = useState(30)
  const [chartType, setChartType] = useState("area") // area | line | bar

  useEffect(() => {
    async function load() {
      try {
        const [lRes, hRes, rRes] = await Promise.allSettled([
          fetchLatestIndex(),
          fetchIndexHistory(365),
          fetchRoutes(),
        ])
        const l = lRes.status === "fulfilled" && lRes.value ? lRes.value : null
        const h = hRes.status === "fulfilled" && hRes.value ? hRes.value : null
        const r = rRes.status === "fulfilled" && rRes.value ? rRes.value : null

        setLatest(l || { apix_value: 99.35, index_date: "2026-09-16" })
        setHistory(h?.history?.length ? h.history : DEFAULT_HISTORY)
        setRoutes(r?.routes?.length ? r.routes : DEFAULT_ROUTES)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // ── Derived data ──────────────────────────────────────────────────────────
  const apix     = latest?.apix_value ?? 100
  const historyToUse = history.length > 0 ? history : DEFAULT_HISTORY
  const sliced   = historyToUse.slice(-range)
  const prev     = historyToUse.slice(-range * 2, -range)

  const chartData = sliced.map((h, i) => ({
    date:      h.index_date?.slice(5) ?? "",
    fullDate:  h.index_date ?? "",
    apix:      h.apix_value,
    prevPeriod: prev[i]?.apix_value ?? null,
  }))

  // Weekly averages
  const weeklyData = (() => {
    const dataToUse = sliced.length >= 7 ? sliced : historyToUse
    const weeks = []
    const step = Math.max(1, Math.round(dataToUse.length / 4)) || 7
    for (let i = 0; i < dataToUse.length; i += step) {
      const chunk = dataToUse.slice(i, i + step)
      if (!chunk.length) continue
      const avg = chunk.reduce((s, h) => s + (h.apix_value || 100), 0) / chunk.length
      weeks.push({
        week:  `W${Math.floor(i / step) + 1}`,
        apix:  +avg.toFixed(2),
        color: avg > 100 ? colors.red : colors.green,
      })
    }
    return weeks
  })()

  // Route decomposition — contribution of each route to index
  const routesToUse = routes.length > 0 ? routes : DEFAULT_ROUTES
  const decompData = routesToUse.map(r => ({
    route:        r.route,
    contribution: +(((r.weight || 10) / 100) * ((r.avg_fare || 3800) / 3800 * 100)).toFixed(2),
    weight:       r.weight || 10,
    avgFare:      r.avg_fare || 3800,
    change:       r.change_pct ?? 0,
  })).sort((a, b) => b.contribution - a.contribution)

  // Stats
  const vals     = sliced.map(h => h.apix_value)
  const highest  = vals.length ? Math.max(...vals) : 0
  const lowest   = vals.length ? Math.min(...vals) : 0
  const avgVal   = vals.length
    ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
  const volatility = vals.length > 1
    ? +(Math.sqrt(vals.reduce((s, v) =>
        s + Math.pow(v - avgVal, 2), 0) / vals.length)).toFixed(2)
    : 0

  const daysUp   = sliced.filter((h, i) =>
    i > 0 && h.apix_value > sliced[i-1].apix_value).length
  const daysDown = sliced.filter((h, i) =>
    i > 0 && h.apix_value < sliced[i-1].apix_value).length

  const trend = sliced.length > 1
    ? ((sliced[sliced.length-1]?.apix_value - sliced[0]?.apix_value)
       / sliced[0]?.apix_value * 100).toFixed(1)
    : 0

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto",
                  padding: "40px 20px 80px" }}>

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between",
                    alignItems: "flex-start", marginBottom: 32,
                    flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center",
                        gap: 12, marginBottom: 8 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800,
                         color: colors.textPrimary,
                         letterSpacing: "-0.5px" }}>
              APIx — National Index
            </h1>
            <LiveBadge />
          </div>
          <p style={{ fontSize: 14, color: colors.textSecondary,
                      maxWidth: 500 }}>
            Passenger-weighted airfare price index across 8 major Indian
            routes. Laspeyres methodology · T+7 advance window ·
            Base period = 100
          </p>
        </div>
        <div style={{
          ...glass.card, padding: "16px 24px",
          borderRadius: 14, textAlign: "center",
          borderTop: `2px solid ${apix > 100 ? colors.red : colors.green}`,
        }}>
          <div style={{ fontSize: 11, color: colors.textMuted,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em", marginBottom: 4 }}>
            Current APIx
          </div>
          <div style={{ fontSize: 44, fontWeight: 900,
                        color: colors.textPrimary,
                        letterSpacing: "-2px" }}>
            {loading ? "—" : apix.toFixed(1)}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600,
                        color: apix > 100 ? colors.red : colors.green }}>
            {apix > 100
              ? `▲ ${(apix - 100).toFixed(1)}% above base`
              : `▼ ${(100 - apix).toFixed(1)}% below base`}
          </div>
        </div>
      </div>

      {/* ── Stat cards ───────────────────────────────────────────────────── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: 14, marginBottom: 28,
      }}>
        <StatCard label="Period High"   icon="📈"
          value={loading ? "—" : highest.toFixed(1)}
          sub={`in last ${range} days`} subUp={true}
          accentColor={colors.red} loading={loading} />
        <StatCard label="Period Low"    icon="📉"
          value={loading ? "—" : lowest.toFixed(1)}
          sub={`in last ${range} days`} subUp={false}
          accentColor={colors.green} loading={loading} />
        <StatCard label="Period Avg"    icon="📊"
          value={loading ? "—" : avgVal.toFixed(1)}
          sub="average index" accentColor={colors.blue}
          loading={loading} />
        <StatCard label="Volatility"    icon="〰"
          value={loading ? "—" : volatility}
          sub="std deviation" accentColor={colors.amber}
          loading={loading} />
        <StatCard label="Trend"         icon="🎯"
          value={loading ? "—" : `${trend > 0 ? "+" : ""}${trend}%`}
          sub={`over ${range} days`}
          subUp={trend > 0} accentColor={colors.purple}
          loading={loading} />
        <StatCard label="Days Rising"   icon="☀"
          value={loading ? "—" : `${daysUp}d`}
          sub={`${daysDown}d falling`}
          accentColor={colors.cyan} loading={loading} />
      </div>

      {/* ── Main chart ───────────────────────────────────────────────────── */}
      <GlassCard style={{ marginBottom: 24 }}>
        {/* Chart controls */}
        <div style={{ display: "flex", justifyContent: "space-between",
                      alignItems: "center", marginBottom: 20,
                      flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700,
                          color: colors.textPrimary }}>
              APIx Historical Trend
            </div>
            <div style={{ fontSize: 12, color: colors.textSecondary,
                          marginTop: 4 }}>
              Dashed line = previous period · Solid = current
            </div>
          </div>

          {/* Range selector */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {RANGES.map(r => (
              <RangeBtn key={r.label} label={r.label}
                active={range === r.days}
                onClick={() => setRange(r.days)} />
            ))}
          </div>
        </div>

        {/* Chart type toggle */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
          {["area","line","bar"].map(type => (
            <button key={type} onClick={() => setChartType(type)} style={{
              padding: "4px 12px", borderRadius: 6, border: "none",
              fontSize: 11, cursor: "pointer", fontWeight: 500,
              background: chartType === type
                ? "rgba(59,130,246,0.2)"
                : "rgba(255,255,255,0.04)",
              color: chartType === type
                ? colors.blue : colors.textMuted,
              border: chartType === type
                ? `1px solid rgba(59,130,246,0.3)`
                : `1px solid ${colors.border}`,
              textTransform: "capitalize",
            }}>
              {type}
            </button>
          ))}
        </div>

        {loading ? <Skeleton h={320} radius={8} /> : (
          <ResponsiveContainer width="100%" height={320}>
            {chartType === "bar" ? (
              <ComposedChart data={chartData}
                margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={colors.blue} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={colors.blue} stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3"
                               stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date"
                       tick={{ fontSize: 10, fill: colors.textMuted }}
                       axisLine={false} tickLine={false}
                       interval={Math.floor(chartData.length / 8)} />
                <YAxis domain={["auto","auto"]}
                       tick={{ fontSize: 10, fill: colors.textMuted }}
                       axisLine={false} tickLine={false} />
                <Tooltip content={<IndexTooltip />} />
                <ReferenceLine y={100} stroke={colors.textMuted}
                               strokeDasharray="4 4" />
                <Bar dataKey="apix" fill="url(#barGrad)"
                     radius={[3,3,0,0]} name="APIx" />
              </ComposedChart>
            ) : chartType === "line" ? (
              <ComposedChart data={chartData}
                margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3"
                               stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date"
                       tick={{ fontSize: 10, fill: colors.textMuted }}
                       axisLine={false} tickLine={false}
                       interval={Math.floor(chartData.length / 8)} />
                <YAxis domain={["auto","auto"]}
                       tick={{ fontSize: 10, fill: colors.textMuted }}
                       axisLine={false} tickLine={false} />
                <Tooltip content={<IndexTooltip />} />
                <ReferenceLine y={100} stroke={colors.textMuted}
                               strokeDasharray="4 4" />
                <Line type="monotone" dataKey="apix" stroke={colors.blue}
                      strokeWidth={2.5} dot={false} name="APIx" />
                <Line type="monotone" dataKey="prevPeriod"
                      stroke={colors.textMuted} strokeWidth={1}
                      strokeDasharray="4 4" dot={false}
                      name="Previous period" />
              </ComposedChart>
            ) : (
              <ComposedChart data={chartData}
                margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={colors.blue} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={colors.blue} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3"
                               stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date"
                       tick={{ fontSize: 10, fill: colors.textMuted }}
                       axisLine={false} tickLine={false}
                       interval={Math.floor(chartData.length / 8)} />
                <YAxis domain={["auto","auto"]}
                       tick={{ fontSize: 10, fill: colors.textMuted }}
                       axisLine={false} tickLine={false} />
                <Tooltip content={<IndexTooltip />} />
                <ReferenceLine y={100} stroke={colors.textMuted}
                               strokeDasharray="4 4"
                               label={{ value: "Base=100",
                                        fill: colors.textMuted,
                                        fontSize: 10 }} />
                <Area type="monotone" dataKey="apix" stroke={colors.blue}
                      strokeWidth={2.5} fill="url(#areaGrad)"
                      dot={false} name="APIx" />
                <Line type="monotone" dataKey="prevPeriod"
                      stroke={colors.textMuted} strokeWidth={1}
                      strokeDasharray="4 4" dot={false}
                      name="Prev period" />
              </ComposedChart>
            )}
          </ResponsiveContainer>
        )}
      </GlassCard>

      {/* ── Weekly averages + Decomposition ──────────────────────────────── */}
      <div style={{ display: "grid",
                    gridTemplateColumns: "1fr 1.4fr",
                    gap: 20, marginBottom: 24 }}>

        {/* Weekly bar chart */}
        <GlassCard>
          <div style={{ fontSize: 15, fontWeight: 700,
                        color: colors.textPrimary, marginBottom: 6 }}>
            Weekly Averages
          </div>
          <div style={{ fontSize: 12, color: colors.textSecondary,
                        marginBottom: 16 }}>
            Average APIx per week
          </div>
          {loading ? <Skeleton h={200} radius={8} /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyData}
                margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3"
                               stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="week"
                       tick={{ fontSize: 11, fill: colors.textMuted }}
                       axisLine={false} tickLine={false} />
                <YAxis domain={["auto","auto"]}
                       tick={{ fontSize: 10, fill: colors.textMuted }}
                       axisLine={false} tickLine={false} />
                <Tooltip formatter={v => [v.toFixed(2), "Avg APIx"]} />
                <ReferenceLine y={100} stroke={colors.textMuted}
                               strokeDasharray="4 4" />
                <Bar dataKey="apix" radius={[4,4,0,0]}>
                  {weeklyData.map((entry, i) => (
                    <Cell key={i}
                      fill={entry.apix > 100 ? colors.red : colors.green}
                      fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </GlassCard>

        {/* Route decomposition */}
        <GlassCard>
          <div style={{ fontSize: 15, fontWeight: 700,
                        color: colors.textPrimary, marginBottom: 6 }}>
            Index Decomposition
          </div>
          <div style={{ fontSize: 12, color: colors.textSecondary,
                        marginBottom: 16 }}>
            Each route's contribution to the national index
          </div>
          {loading ? <Skeleton h={200} radius={8} /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={decompData} layout="vertical"
                margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3"
                               stroke="rgba(255,255,255,0.04)" />
                <XAxis type="number"
                       tick={{ fontSize: 10, fill: colors.textMuted }}
                       axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="route" width={65}
                       tick={{ fontSize: 11, fill: colors.textMuted }}
                       axisLine={false} tickLine={false} />
                <Tooltip content={<DecompTooltip />} />
                <Bar dataKey="contribution" radius={[0,4,4,0]}>
                  {decompData.map((entry, i) => (
                    <Cell key={i}
                      fill={entry.change > 0 ? colors.red : colors.green}
                      fillOpacity={0.75} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </GlassCard>
      </div>

      {/* ── Route contribution table ──────────────────────────────────────── */}
      <GlassCard>
        <div style={{ fontSize: 15, fontWeight: 700,
                      color: colors.textPrimary, marginBottom: 6 }}>
          Route-level Index Detail
        </div>
        <div style={{ fontSize: 12, color: colors.textSecondary,
                      marginBottom: 20 }}>
          How each corridor contributes to the national APIx today
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse",
                          fontSize: 13 }}>
            <thead>
              <tr>
                {["Route","Name","Weight","Avg Fare","vs Last Week",
                  "Route Index","Contribution"].map(h => (
                  <th key={h} style={{
                    padding: "10px 14px", textAlign: "left",
                    fontSize: 11, color: colors.textMuted,
                    textTransform: "uppercase", letterSpacing: "0.07em",
                    borderBottom: `1px solid ${colors.border}`,
                    whiteSpace: "nowrap",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(7)].map((_, j) => (
                      <td key={j} style={{ padding: "12px 14px" }}>
                        <Skeleton h={16} radius={4} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : routes.map((r, i) => {
                const up = r.change_pct > 0
                return (
                  <tr key={i} style={{
                    borderBottom: `1px solid ${colors.border}`,
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={e =>
                    e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                  onMouseLeave={e =>
                    e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "14px", fontWeight: 700,
                                 color: colors.blue,
                                 fontFamily: "monospace" }}>
                      {r.route}
                    </td>
                    <td style={{ padding: "14px",
                                 color: colors.textSecondary }}>
                      {r.name}
                    </td>
                    <td style={{ padding: "14px",
                                 color: colors.textPrimary }}>
                      {r.weight}%
                    </td>
                    <td style={{ padding: "14px", fontWeight: 600,
                                 color: colors.textPrimary }}>
                      ₹{r.avg_fare?.toLocaleString("en-IN") ?? "—"}
                    </td>
                    <td style={{ padding: "14px" }}>
                      <span style={{
                        color: up ? colors.red : colors.green,
                        fontWeight: 600, fontSize: 13,
                      }}>
                        {up ? "▲" : "▼"} {Math.abs(r.change_pct)}%
                      </span>
                    </td>
                    <td style={{ padding: "14px",
                                 color: colors.textPrimary, fontWeight: 600 }}>
                      {r.avg_fare
                        ? (r.avg_fare / 3800 * 100).toFixed(1)
                        : "—"}
                    </td>
                    <td style={{ padding: "14px" }}>
                      <div style={{ display: "flex",
                                    alignItems: "center", gap: 8 }}>
                        <div style={{
                          height: 6,
                          width: `${Math.min(r.weight * 4, 100)}%`,
                          background: up
                            ? "linear-gradient(90deg, #dc2626, #ef4444)"
                            : "linear-gradient(90deg, #059669, #10b981)",
                          borderRadius: 3, minWidth: 20,
                        }} />
                        <span style={{ fontSize: 12,
                                       color: colors.textSecondary,
                                       whiteSpace: "nowrap" }}>
                          {(r.weight / 100 *
                            (r.avg_fare / 3800 * 100)).toFixed(2)} pts
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  )
}