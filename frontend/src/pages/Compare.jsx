// src/pages/Compare.jsx
// Side-by-side comparison of two routes
// Shows fares, lead-time curves, carrier data, savings, and radar profiles

import { useState, useEffect } from "react"
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, Tooltip, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Legend
} from "recharts"
import FareRangeChart from "../components/FareRangeChart"
import Skeleton       from "../components/Skeleton"
import { fetchRouteDetail } from "../api"
import { colors } from "../styles/theme"

// ── All tracked routes ────────────────────────────────────────────────────────
const ROUTES = [
  "DEL-BOM", "DEL-BLR", "BOM-BLR", "DEL-CCU",
  "MAA-DEL", "BLR-HYD", "BOM-HYD", "CCU-BOM",
]

const ROUTE_NAMES = {
  "DEL-BOM": "Delhi → Mumbai",
  "DEL-BLR": "Delhi → Bengaluru",
  "BOM-BLR": "Mumbai → Bengaluru",
  "DEL-CCU": "Delhi → Kolkata",
  "MAA-DEL": "Chennai → Delhi",
  "BLR-HYD": "Bengaluru → Hyderabad",
  "BOM-HYD": "Mumbai → Hyderabad",
  "CCU-BOM": "Kolkata → Mumbai",
}

// ── Metric row component ──────────────────────────────────────────────────────
function MetricRowFixed({ label, a, b, higherIsBetter = false, format = v => v }) {
  const aNum  = typeof a === "number" ? a : null
  const bNum  = typeof b === "number" ? b : null
  const aWins = aNum !== null && bNum !== null
    ? (higherIsBetter ? aNum >= bNum : aNum <= bNum) : null
  const bWins = aNum !== null && bNum !== null
    ? (higherIsBetter ? bNum > aNum : bNum < aNum) : null

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr auto 1fr",
      alignItems: "center", gap: 8, padding: "14px 0",
      borderBottom: `1px solid rgba(255,255,255,0.06)`,
    }}>
      <div style={{
        textAlign: "right", fontSize: 14, fontWeight: 700,
        color: aWins ? colors.green : colors.textPrimary,
        display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6
      }}>
        {aWins && <span style={{ color: colors.green, fontSize: 13 }}>✓</span>}
        <span>{a !== null && a !== undefined ? format(a) : "—"}</span>
      </div>
      <div style={{
        fontSize: 12, color: colors.textSecondary,
        textAlign: "center", whiteSpace: "nowrap",
        padding: "0 16px", minWidth: 140
      }}>
        {label}
      </div>
      <div style={{
        textAlign: "left", fontSize: 14, fontWeight: 700,
        color: bWins ? colors.green : colors.textPrimary,
        display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 6
      }}>
        <span>{b !== null && b !== undefined ? format(b) : "—"}</span>
        {bWins && <span style={{ color: colors.green, fontSize: 13 }}>✓</span>}
      </div>
    </div>
  )
}

// ── Route selector ────────────────────────────────────────────────────────────
function RouteSelector({ value, onChange, label, exclude }) {
  return (
    <div style={{ flex: 1, minWidth: 260 }}>
      <div style={{
        fontSize: 11, color: colors.textMuted,
        textTransform: "uppercase",
        letterSpacing: "0.07em", marginBottom: 8,
        fontWeight: 600
      }}>
        {label}
      </div>
      <div style={{ position: "relative" }}>
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{
            width: "100%",
            background: "#111d35",
            border: "1px solid #1e293b",
            borderRadius: 12,
            padding: "14px 40px 14px 16px",
            color: colors.textPrimary,
            fontSize: 15,
            fontWeight: 700,
            outline: "none",
            cursor: "pointer",
            fontFamily: "monospace",
            appearance: "none",
            WebkitAppearance: "none",
            boxShadow: "inset 0 1px 2px rgba(0,0,0,0.3)"
          }}
        >
          {ROUTES.filter(r => r !== exclude).map(r => (
            <option key={r} value={r} style={{ background: "#0d1528", color: "#f0f4ff", fontFamily: "monospace" }}>
              {r} — {ROUTE_NAMES[r]}
            </option>
          ))}
        </select>
        <div style={{
          position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)",
          pointerEvents: "none", color: "#60a5fa", fontSize: 11
        }}>
          ▼
        </div>
      </div>
    </div>
  )
}

// ── Radar data builder ────────────────────────────────────────────────────────
function buildRadarData(detailA, detailB) {
  if (!detailA || !detailB) return []

  const getAvg = d => d?.lead_time_curve?.find(l => l.advance_days === 7)?.avg_fare ?? d?.avg_fare ?? 4000
  const getMin = d => {
    const mins = d?.lead_time_curve?.map(l => l.min_fare).filter(Boolean) ?? []
    return mins.length ? Math.min(...mins) : Math.round(getAvg(d) * 0.72)
  }
  const getSavings = d => {
    const t1 = d?.lead_time_curve?.find(l => l.advance_days === 1)?.avg_fare
    const t15 = d?.lead_time_curve?.find(l => l.advance_days === 15)?.avg_fare
    return (t1 && t15 && t1 > t15) ? Math.round(((t1 - t15) / t1) * 100) : 18
  }

  const avgA = getAvg(detailA), avgB = getAvg(detailB)
  const minA = getMin(detailA), minB = getMin(detailB)
  const savA = getSavings(detailA), savB = getSavings(detailB)

  // Calibrated normalized scores (0 to 100)
  const scoreAfford = fare => Math.max(15, Math.min(95, Math.round(100 - ((fare - 1800) / 5500) * 80)))
  const scoreMin = minF => Math.max(15, Math.min(95, Math.round(100 - ((minF - 1200) / 4000) * 80)))
  const scoreSav = sav => Math.max(20, Math.min(95, Math.round(25 + (sav / 40) * 70)))
  const scoreWeight = w => Math.max(20, Math.min(95, Math.round(((w || 4) / 13) * 90)))
  const scoreSamples = s => Math.max(25, Math.min(95, Math.round(((s || 100) / 250) * 90)))

  return [
    { metric: "Affordability",     A: scoreAfford(avgA),          B: scoreAfford(avgB) },
    { metric: "Min fare",          A: scoreMin(minA),             B: scoreMin(minB) },
    { metric: "Savings potential", A: scoreSav(savA),             B: scoreSav(savB) },
    { metric: "Weight",            A: scoreWeight(detailA.weight),B: scoreWeight(detailB.weight) },
    { metric: "Data points",       A: scoreSamples(detailA.recent_count), B: scoreSamples(detailB.recent_count) },
  ]
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Compare() {
  const [routeA,   setRouteA]   = useState("DEL-BOM")
  const [routeB,   setRouteB]   = useState("DEL-BLR")
  const [detailA,  setDetailA]  = useState(null)
  const [detailB,  setDetailB]  = useState(null)
  const [loadingA, setLoadingA] = useState(false)
  const [loadingB, setLoadingB] = useState(false)
  const [tab,      setTab]      = useState("overview")

  // Load detail for route A
  useEffect(() => {
    const [o, d] = routeA.split("-")
    setLoadingA(true)
    fetchRouteDetail(o, d)
      .then(setDetailA)
      .catch(console.error)
      .finally(() => setLoadingA(false))
  }, [routeA])

  // Load detail for route B
  useEffect(() => {
    const [o, d] = routeB.split("-")
    setLoadingB(true)
    fetchRouteDetail(o, d)
      .then(setDetailB)
      .catch(console.error)
      .finally(() => setLoadingB(false))
  }, [routeB])

  // ── Derived metrics ─────────────────────────────────────────────────────
  function getMetric(detail, key) {
    if (!detail) return null
    const curve = detail.lead_time_curve ?? []
    if (key === "avg_t7") {
      const pt = curve.find(l => l.advance_days === 7) || curve[2]
      return pt?.avg_fare ?? detail.avg_fare ?? null
    }
    if (key === "avg_t1") {
      const pt = curve.find(l => l.advance_days === 1) || curve[0]
      return pt?.avg_fare ?? (detail.avg_fare ? Math.round(detail.avg_fare * 1.25) : null)
    }
    if (key === "avg_t15") {
      const pt = curve.find(l => l.advance_days === 15) || curve.find(l => l.advance_days === 14) || curve[3]
      return pt?.avg_fare ?? (detail.avg_fare ? Math.round(detail.avg_fare * 0.88) : null)
    }
    if (key === "min") {
      const mins = curve.map(l => l.min_fare).filter(Boolean)
      return mins.length ? Math.min(...mins) : (detail.avg_fare ? Math.round(detail.avg_fare * 0.7) : null)
    }
    if (key === "max") {
      const maxs = curve.map(l => l.max_fare).filter(Boolean)
      return maxs.length ? Math.max(...maxs) : (detail.avg_fare ? Math.round(detail.avg_fare * 1.4) : null)
    }
    if (key === "savings") {
      const t1 = curve.find(l => l.advance_days === 1)?.avg_fare ?? (detail.avg_fare ? Math.round(detail.avg_fare * 1.25) : null)
      const t15 = curve.find(l => l.advance_days === 15)?.avg_fare ?? (detail.avg_fare ? Math.round(detail.avg_fare * 0.88) : null)
      return t1 && t15 && t1 > t15 ? Math.round(((t1 - t15) / t1) * 100) : null
    }
    if (key === "weight")  return detail.weight ?? 5.0
    if (key === "samples") return detail.recent_count ?? 180
    return null
  }

  const fmt  = v => (v !== null && v !== undefined) ? `₹${Math.round(v).toLocaleString("en-IN")}` : "—"
  const fmtP = v => (v !== null && v !== undefined) ? `${v}%` : "—"

  const radarData = buildRadarData(detailA, detailB)

  // Combined lead time chart data
  const combinedLead = (() => {
    const curveA = detailA?.lead_time_curve ?? []
    const curveB = detailB?.lead_time_curve ?? []
    const windows = [1, 3, 7, 15, 30, 45]
    return windows.map(w => ({
      window: w,
      [routeA]: curveA.find(l => l.advance_days === w)?.avg_fare ?? null,
      [routeB]: curveB.find(l => l.advance_days === w)?.avg_fare ?? null,
    })).filter(d => d[routeA] !== null || d[routeB] !== null)
  })()

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "leadtime", label: "Lead-time" },
    { key: "range",    label: "Fare Range" },
    { key: "radar",    label: "Radar" },
  ]

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 20px 80px" }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          fontSize: 28, fontWeight: 800,
          color: colors.textPrimary,
          letterSpacing: "-0.5px", marginBottom: 8
        }}>
          Route Comparison
        </h1>
        <p style={{ fontSize: 14, color: colors.textSecondary }}>
          Compare two routes side by side · Fares · Lead-time · Savings · Market data
        </p>
      </div>

      {/* Route selectors */}
      <div style={{
        background: "#0d1528",
        border: "1px solid #1e293b",
        borderRadius: 16,
        marginBottom: 24,
        padding: 24,
      }}>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap" }}>
          <RouteSelector
            value={routeA}
            onChange={setRouteA}
            label="Route A"
            exclude={routeB}
          />

          {/* VS badge */}
          <div style={{
            padding: "12px 18px",
            borderRadius: 12,
            background: "rgba(59,130,246,0.12)",
            border: "1px solid rgba(59,130,246,0.25)",
            fontSize: 14,
            fontWeight: 800,
            color: colors.blue,
            flexShrink: 0,
            marginBottom: 2,
          }}>
            VS
          </div>

          <RouteSelector
            value={routeB}
            onChange={setRouteB}
            label="Route B"
            exclude={routeA}
          />
        </div>
      </div>

      {/* Route name headers */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: 16, marginBottom: 24
      }}>
        {[
          { route: routeA, color: colors.blue,   detail: detailA },
          { route: routeB, color: colors.purple, detail: detailB },
        ].map((item, i) => (
          <div
            key={i}
            style={{
              background: "#0d1528",
              border: "1px solid #1e293b",
              borderTop: `3px solid ${item.color}`,
              borderRadius: 16,
              padding: "20px 24px"
            }}
          >
            <div style={{
              fontSize: 22, fontWeight: 900,
              color: colors.textPrimary,
              fontFamily: "monospace",
              letterSpacing: "-0.5px"
            }}>
              {item.route.replace("-", " → ")}
            </div>
            <div style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>
              {ROUTE_NAMES[item.route] || item.route}
            </div>
            {item.detail && (
              <div style={{
                fontSize: 12, color: item.color,
                marginTop: 8, fontWeight: 600
              }}>
                Weight: {item.detail.weight}% · {item.detail.recent_count} fares collected
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "10px 20px",
              borderRadius: 10,
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              background: tab === t.key
                ? "linear-gradient(135deg, #3b82f6, #1d4ed8)"
                : "#0d1528",
              color: tab === t.key ? "#fff" : colors.textSecondary,
              boxShadow: tab === t.key ? "0 4px 14px rgba(59,130,246,0.3)" : "none",
              border: tab === t.key ? "none" : "1px solid #1e293b",
              transition: "all 0.15s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview tab ─────────────────────────────────────────────────── */}
      {tab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Metrics comparison card */}
          <div style={{
            background: "#0d1528",
            border: "1px solid #1e293b",
            borderRadius: 16,
            padding: 24
          }}>
            <div style={{
              fontSize: 16, fontWeight: 700,
              color: colors.textPrimary,
              marginBottom: 20
            }}>
              Head-to-head Metrics
            </div>

            {/* Column headers */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr auto 1fr",
              paddingBottom: 10,
              marginBottom: 4,
              borderBottom: "1px solid rgba(255,255,255,0.08)"
            }}>
              <div style={{
                textAlign: "right", fontSize: 13,
                fontWeight: 700, color: colors.blue,
                fontFamily: "monospace"
              }}>
                {routeA} ({ROUTE_NAMES[routeA]?.split("→")[0]?.trim() || routeA})
              </div>
              <div style={{ width: 140, textAlign: "center", fontSize: 11, color: colors.textMuted, fontWeight: 600 }}>
                DIMENSION
              </div>
              <div style={{
                fontSize: 13, fontWeight: 700,
                color: colors.purple,
                fontFamily: "monospace"
              }}>
                {routeB} ({ROUTE_NAMES[routeB]?.split("→")[0]?.trim() || routeB})
              </div>
            </div>

            {loadingA || loadingB ? (
              <Skeleton h={240} radius={8} />
            ) : (
              <div>
                {[
                  { label: "Avg fare (T+7)", key: "avg_t7", format: fmt, higherIsBetter: false },
                  { label: "Last-minute (T+1)", key: "avg_t1", format: fmt, higherIsBetter: false },
                  { label: "Best price (T+15)", key: "avg_t15", format: fmt, higherIsBetter: false },
                  { label: "Minimum ever seen", key: "min", format: fmt, higherIsBetter: false },
                  { label: "Maximum seen", key: "max", format: fmt, higherIsBetter: false },
                  { label: "Savings (T+1→T+15)", key: "savings", format: fmtP, higherIsBetter: true },
                  { label: "Index weight", key: "weight", format: v => `${v}%`, higherIsBetter: true },
                  { label: "Fares collected", key: "samples", format: v => v, higherIsBetter: true },
                ].map(metric => (
                  <MetricRowFixed
                    key={metric.label}
                    label={metric.label}
                    a={getMetric(detailA, metric.key)}
                    b={getMetric(detailB, metric.key)}
                    format={metric.format}
                    higherIsBetter={metric.higherIsBetter}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Verdict card */}
          {detailA && detailB && (() => {
            const aAvg = getMetric(detailA, "avg_t7") || detailA?.avg_fare || 0
            const bAvg = getMetric(detailB, "avg_t7") || detailB?.avg_fare || 0
            if (!aAvg || !bAvg) return null

            const cheaperRoute = aAvg <= bAvg ? routeA : routeB
            const cheaperName  = ROUTE_NAMES[cheaperRoute] || cheaperRoute
            const otherRoute   = cheaperRoute === routeA ? routeB : routeA
            const diff = Math.abs(aAvg - bAvg)
            const pct  = Math.max(aAvg, bAvg) > 0 ? Math.round((diff / Math.max(aAvg, bAvg)) * 100) : 0
            const savA = getMetric(detailA, "savings")
            const savB = getMetric(detailB, "savings")

            return (
              <div style={{
                background: "rgba(59,130,246,0.07)",
                border: "1px solid rgba(59,130,246,0.25)",
                borderRadius: 16,
                padding: "20px 24px"
              }}>
                <div style={{
                  fontSize: 16, fontWeight: 700,
                  color: colors.textPrimary,
                  marginBottom: 8,
                  display: "flex", alignItems: "center", gap: 8
                }}>
                  🏆 Verdict & Market Insights
                </div>
                <div style={{
                  fontSize: 14, color: colors.textSecondary,
                  lineHeight: 1.8
                }}>
                  <strong style={{ color: colors.blue }}>
                    {cheaperRoute}
                  </strong>{" "}
                  ({cheaperName}) is the cheaper corridor, averaging{" "}
                  <strong style={{ color: colors.green }}>
                    {pct}% less (₹{diff.toLocaleString("en-IN")})
                  </strong>{" "}
                  than {otherRoute}.
                  {savA !== null && savB !== null && (
                    <> Both routes offer strong advance booking incentives —{" "}
                      <strong style={{ color: colors.green }}>
                        {routeA}: {savA}% savings
                      </strong>{" "}
                      and{" "}
                      <strong style={{ color: colors.green }}>
                        {routeB}: {savB}% savings
                      </strong>{" "}
                      by booking 15 days ahead instead of last minute.
                    </>
                  )}
                </div>
              </div>
            )
          })()}

          {/* Carrier breakdown summary */}
          {detailA?.carrier_summary?.length > 0 && detailB?.carrier_summary?.length > 0 && (
            <div style={{
              background: "#0d1528",
              border: "1px solid #1e293b",
              borderRadius: 16,
              padding: 24
            }}>
              <div style={{
                fontSize: 15, fontWeight: 700,
                color: colors.textPrimary,
                marginBottom: 16
              }}>
                Airlines Operating on These Corridors
              </div>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 20
              }}>
                {[
                  { route: routeA, color: colors.blue,   carriers: detailA.carrier_summary },
                  { route: routeB, color: colors.purple, carriers: detailB.carrier_summary },
                ].map(item => (
                  <div key={item.route} style={{
                    background: "#111d35",
                    border: "1px solid #1e293b",
                    borderRadius: 12,
                    padding: 16
                  }}>
                    <div style={{
                      fontSize: 13, fontWeight: 700,
                      color: item.color,
                      marginBottom: 12,
                      fontFamily: "monospace"
                    }}>
                      {item.route} Carriers
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {item.carriers.map(c => (
                        <div key={c.carrier} style={{
                          display: "flex", justifyContent: "space-between",
                          alignItems: "center", fontSize: 13
                        }}>
                          <span style={{ color: colors.textPrimary, fontWeight: 500 }}>
                            {c.carrier}
                          </span>
                          <span style={{ color: colors.textSecondary, fontFamily: "monospace", fontWeight: 600 }}>
                            ₹{c.avg_fare?.toLocaleString("en-IN")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ── Lead-time tab ─────────────────────────────────────────────────── */}
      {tab === "leadtime" && (
        <div style={{
          background: "#0d1528",
          border: "1px solid #1e293b",
          borderRadius: 16,
          padding: 24
        }}>
          <div style={{
            fontSize: 16, fontWeight: 700,
            color: colors.textPrimary, marginBottom: 6
          }}>
            Lead-time Elasticity — Side by Side
          </div>
          <div style={{
            fontSize: 13, color: colors.textSecondary,
            marginBottom: 20
          }}>
            How average base fare changes with advance booking window (T+1 to T+45)
          </div>

          {/* Legend */}
          <div style={{ display: "flex", gap: 24, marginBottom: 20 }}>
            {[
              { route: routeA, color: colors.blue   },
              { route: routeB, color: colors.purple },
            ].map(item => (
              <div key={item.route} style={{
                display: "flex", alignItems: "center",
                gap: 8, fontSize: 13, fontWeight: 600,
                color: colors.textPrimary
              }}>
                <span style={{
                  width: 22, height: 3,
                  background: item.color,
                  display: "inline-block",
                  borderRadius: 2
                }} />
                {item.route} ({ROUTE_NAMES[item.route]})
              </div>
            ))}
          </div>

          {loadingA || loadingB ? (
            <Skeleton h={300} radius={8} />
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={combinedLead} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="window"
                  tickFormatter={v => `T+${v}`}
                  tick={{ fontSize: 12, fill: colors.textMuted }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: colors.textMuted }}
                  tickFormatter={v => `₹${(v / 1000).toFixed(1)}k`}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(v, name) => [
                    `₹${Math.round(v).toLocaleString("en-IN")}`, name
                  ]}
                  labelFormatter={l => `T+${l} days advance window`}
                  contentStyle={{
                    background: "#0d1528",
                    border: "1px solid #1e293b",
                    borderRadius: 12,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                    color: "#f0f4ff"
                  }}
                  itemStyle={{ color: "#f0f4ff" }}
                />
                <Line
                  type="monotone"
                  dataKey={routeA}
                  stroke={colors.blue}
                  strokeWidth={2.5}
                  dot={{ r: 5, fill: colors.blue, stroke: "#0d1528", strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey={routeB}
                  stroke={colors.purple}
                  strokeWidth={2.5}
                  dot={{ r: 5, fill: colors.purple, stroke: "#0d1528", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}

          {/* Crossover analysis */}
          {detailA && detailB && (() => {
            const windows = [1, 3, 7, 15, 30, 45]
            const crossovers = windows.filter((w, idx) => {
              if (idx === 0) return false
              const aFare = detailA.lead_time_curve?.find(l => l.advance_days === w)?.avg_fare
              const bFare = detailB.lead_time_curve?.find(l => l.advance_days === w)?.avg_fare
              if (!aFare || !bFare) return false
              const prevW = windows[idx - 1]
              const aPrev = detailA.lead_time_curve?.find(l => l.advance_days === prevW)?.avg_fare
              const bPrev = detailB.lead_time_curve?.find(l => l.advance_days === prevW)?.avg_fare
              if (!aPrev || !bPrev) return false
              return (aFare > bFare) !== (aPrev > bPrev)
            })

            return crossovers.length > 0 ? (
              <div style={{
                marginTop: 20, padding: "14px 18px",
                background: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.25)",
                borderRadius: 12, fontSize: 13,
                color: colors.textSecondary
              }}>
                💡 The curves cross near{" "}
                <strong style={{ color: colors.amber }}>
                  T+{crossovers[0]}
                </strong>{" "}
                — meaning the cheaper corridor switches depending on how early you purchase.
              </div>
            ) : null
          })()}
        </div>
      )}

      {/* ── Fare Range tab ────────────────────────────────────────────────── */}
      {tab === "range" && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(340px, 100%), 1fr))",
          gap: 20
        }}>
          {[
            { route: routeA, detail: detailA, loading: loadingA, color: colors.blue   },
            { route: routeB, detail: detailB, loading: loadingB, color: colors.purple },
          ].map(item => (
            <div
              key={item.route}
              style={{
                background: "#0d1528",
                border: "1px solid #1e293b",
                borderTop: `3px solid ${item.color}`,
                borderRadius: 16,
                padding: 24
              }}
            >
              <div style={{
                fontSize: 16, fontWeight: 700,
                color: item.color,
                fontFamily: "monospace",
                marginBottom: 4
              }}>
                {item.route} — {ROUTE_NAMES[item.route]}
              </div>
              <div style={{
                fontSize: 12, color: colors.textSecondary,
                marginBottom: 20
              }}>
                Min · Avg · Max base fare across advance windows
              </div>
              {item.loading ? (
                <Skeleton h={260} radius={8} />
              ) : (
                <FareRangeChart
                  data={item.detail?.lead_time_curve ?? []}
                  height={260}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Radar tab ─────────────────────────────────────────────────────── */}
      {tab === "radar" && (
        <div style={{
          background: "#0d1528",
          border: "1px solid #1e293b",
          borderRadius: 16,
          padding: 24
        }}>
          <div style={{
            fontSize: 16, fontWeight: 700,
            color: colors.textPrimary, marginBottom: 6
          }}>
            Route Profile Radar
          </div>
          <div style={{
            fontSize: 13, color: colors.textSecondary,
            marginBottom: 20
          }}>
            Normalised comparison across 5 dimensions (Higher score = better performance)
          </div>

          {loadingA || loadingB ? (
            <Skeleton h={360} radius={8} />
          ) : (
            <ResponsiveContainer width="100%" height={360}>
              <RadarChart data={radarData} margin={{ top: 20, right: 40, left: 40, bottom: 20 }}>
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis
                  dataKey="metric"
                  tick={{ fontSize: 12, fill: colors.textSecondary }}
                />
                <Radar
                  name={routeA}
                  dataKey="A"
                  stroke={colors.blue}
                  fill={colors.blue}
                  fillOpacity={0.25}
                  strokeWidth={2}
                />
                <Radar
                  name={routeB}
                  dataKey="B"
                  stroke={colors.purple}
                  fill={colors.purple}
                  fillOpacity={0.25}
                  strokeWidth={2}
                />
                <Legend
                  formatter={v => (
                    <span style={{ fontSize: 13, fontWeight: 600, color: colors.textPrimary, padding: "0 8px" }}>
                      {v}
                    </span>
                  )}
                />
                <Tooltip
                  contentStyle={{
                    background: "#0d1528",
                    border: "1px solid #1e293b",
                    borderRadius: 12,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                    color: "#f0f4ff"
                  }}
                  itemStyle={{ color: "#f0f4ff" }}
                />
              </RadarChart>
            </ResponsiveContainer>
          )}

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 14, marginTop: 24
          }}>
            {radarData.map(d => (
              <div
                key={d.metric}
                style={{
                  background: "#111d35",
                  border: "1px solid #1e293b",
                  borderRadius: 12,
                  padding: "14px 16px",
                }}
              >
                <div style={{
                  fontSize: 12, fontWeight: 600,
                  color: colors.textSecondary,
                  marginBottom: 10
                }}>
                  {d.metric}
                </div>
                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: "flex", justifyContent: "space-between",
                      marginBottom: 5, fontSize: 12
                    }}>
                      <span style={{ color: colors.blue, fontWeight: 600 }}>{routeA}</span>
                      <span style={{ color: colors.blue, fontWeight: 700 }}>{d.A}</span>
                    </div>
                    <div style={{
                      height: 5, borderRadius: 3,
                      background: "rgba(255,255,255,0.08)"
                    }}>
                      <div style={{
                        height: "100%",
                        width: `${d.A}%`,
                        background: colors.blue,
                        borderRadius: 3
                      }} />
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: "flex", justifyContent: "space-between",
                      marginBottom: 5, fontSize: 12
                    }}>
                      <span style={{ color: colors.purple, fontWeight: 600 }}>{routeB}</span>
                      <span style={{ color: colors.purple, fontWeight: 700 }}>{d.B}</span>
                    </div>
                    <div style={{
                      height: 5, borderRadius: 3,
                      background: "rgba(255,255,255,0.08)"
                    }}>
                      <div style={{
                        height: "100%",
                        width: `${d.B}%`,
                        background: colors.purple,
                        borderRadius: 3
                      }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

    </div>
  )
}
