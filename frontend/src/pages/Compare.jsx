// src/pages/Compare.jsx
// Side-by-side comparison of two routes
// Shows fares, lead-time curves, carrier data, savings

import { useState, useEffect } from "react"
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, Tooltip, LineChart, Line,
  XAxis, YAxis, CartesianGrid, BarChart, Bar,
  Cell, Legend
} from "recharts"
import GlassCard      from "../components/GlassCard"
import FareRangeChart from "../components/FareRangeChart"
import Skeleton       from "../components/Skeleton"
import { fetchRouteDetail, fetchRoutes } from "../api"
import { colors, glass } from "../styles/theme"

// ── All tracked routes ────────────────────────────────────────────────────────
const ROUTES = [
  "DEL-BOM","DEL-BLR","BOM-BLR","DEL-CCU",
  "MAA-DEL","BLR-HYD","BOM-HYD","CCU-BOM",
]

const ROUTE_NAMES = {
  "DEL-BOM":"Delhi → Mumbai",    "DEL-BLR":"Delhi → Bengaluru",
  "BOM-BLR":"Mumbai → Bengaluru","DEL-CCU":"Delhi → Kolkata",
  "MAA-DEL":"Chennai → Delhi",   "BLR-HYD":"Bengaluru → Hyderabad",
  "BOM-HYD":"Mumbai → Hyderabad","CCU-BOM":"Kolkata → Mumbai",
}

// ── Metric card ───────────────────────────────────────────────────────────────
function MetricRow({ label, a, b, higherIsBetter = false, format = v => v }) {
  const aNum  = typeof a === "number" ? a : null
  const bNum  = typeof b === "number" ? b : null
  const aWins = aNum !== null && bNum !== null
    ? (higherIsBetter ? aNum >= bNum : aNum <= bNum)
    : null

  return (
    <div style={{
      display:"grid", gridTemplateColumns:"1fr auto 1fr",
      alignItems:"center", gap:8, padding:"12px 0",
      borderBottom:`1px solid ${colors.border}`,
    }}>
      <div style={{
        textAlign:"right",
        fontSize:14, fontWeight:600,
        color: aWins === true ? colors.green
             : aWins === false ? colors.textSecondary
             : colors.textPrimary,
      }}>
        {a !== null && a !== undefined ? format(a) : "—"}
        {aWins === true && (
          <span style={{ marginLeft:6, fontSize:12,
                         color:colors.green }}>✓</span>
        )}
      </div>
      <div style={{ fontSize:11, color:colors.textMuted,
                    textAlign:"center", whiteSpace:"nowrap",
                    padding:"0 12px" }}>
        {label}
      </div>
      <div style={{
        fontSize:14, fontWeight:600,
        color: aWins === false ? colors.green
             : aWins === true  ? colors.textSecondary
             : colors.textPrimary,
      }}>
        {bWins === true && (
          <span style={{ marginRight:6, fontSize:12,
                         color:colors.green }}>✓</span>
        )}
        {b !== null && b !== undefined ? format(b) : "—"}
      </div>
    </div>
  )
}

// Fix: compute bWins inside component
function MetricRowFixed({ label, a, b,
                          higherIsBetter = false,
                          format = v => v }) {
  const aNum  = typeof a === "number" ? a : null
  const bNum  = typeof b === "number" ? b : null
  const aWins = aNum !== null && bNum !== null
    ? (higherIsBetter ? aNum >= bNum : aNum <= bNum) : null
  const bWins = aNum !== null && bNum !== null
    ? (higherIsBetter ? bNum > aNum : bNum < aNum) : null

  return (
    <div style={{
      display:"grid", gridTemplateColumns:"1fr auto 1fr",
      alignItems:"center", gap:8, padding:"12px 0",
      borderBottom:`1px solid ${colors.border}`,
    }}>
      <div style={{ textAlign:"right", fontSize:14, fontWeight:600,
                    color: aWins ? colors.green : colors.textPrimary }}>
        {a !== null && a !== undefined ? format(a) : "—"}
        {aWins && <span style={{ marginLeft:6, color:colors.green,
                                  fontSize:11 }}>✓</span>}
      </div>
      <div style={{ fontSize:11, color:colors.textMuted,
                    textAlign:"center", whiteSpace:"nowrap",
                    padding:"0 16px" }}>
        {label}
      </div>
      <div style={{ fontSize:14, fontWeight:600,
                    color: bWins ? colors.green : colors.textPrimary }}>
        {bWins && <span style={{ marginRight:6, color:colors.green,
                                  fontSize:11 }}>✓</span>}
        {b !== null && b !== undefined ? format(b) : "—"}
      </div>
    </div>
  )
}

// ── Route selector ────────────────────────────────────────────────────────────
function RouteSelector({ value, onChange, label, exclude }) {
  return (
    <div style={{ flex:1 }}>
      <div style={{ fontSize:11, color:colors.textMuted,
                    textTransform:"uppercase",
                    letterSpacing:"0.07em", marginBottom:8 }}>
        {label}
      </div>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{
          width:"100%", background:"rgba(255,255,255,0.06)",
          border:`1px solid ${colors.border}`,
          borderRadius:12, padding:"14px 16px",
          color:colors.textPrimary, fontSize:16,
          fontWeight:700, outline:"none",
          cursor:"pointer", fontFamily:"monospace",
        }}>
        {ROUTES.filter(r => r !== exclude).map(r => (
          <option key={r} value={r}
            style={{ background:"#0d1528", fontFamily:"monospace" }}>
            {r} — {ROUTE_NAMES[r]}
          </option>
        ))}
      </select>
    </div>
  )
}

// ── Radar data builder ────────────────────────────────────────────────────────
function buildRadarData(detailA, detailB) {
  if (!detailA || !detailB) return []

  const getAvg = d => d?.lead_time_curve?.find(
    l => l.advance_days === 7)?.avg_fare ?? 0
  const getMin = d => Math.min(
    ...(d?.lead_time_curve?.map(l => l.avg_fare) ?? [0]))
  const getSavings = d => {
    const t1  = d?.lead_time_curve?.find(l => l.advance_days===1)?.avg_fare
    const t15 = d?.lead_time_curve?.find(l => l.advance_days===15)?.avg_fare
    return t1 && t15 ? Math.round((t1-t15)/t1*100) : 0
  }

  const avgA = getAvg(detailA), avgB = getAvg(detailB)
  const minA = getMin(detailA), minB = getMin(detailB)
  const savA = getSavings(detailA), savB = getSavings(detailB)

  const maxAvg = Math.max(avgA, avgB) || 1
  const maxMin = Math.max(minA, minB) || 1
  const maxSav = Math.max(savA, savB) || 1

  return [
    { metric:"Affordability",
      A: Math.round((1 - avgA/maxAvg) * 100),
      B: Math.round((1 - avgB/maxAvg) * 100) },
    { metric:"Min fare",
      A: Math.round((1 - minA/maxMin) * 100),
      B: Math.round((1 - minB/maxMin) * 100) },
    { metric:"Savings potential",
      A: Math.round(savA/maxSav * 100),
      B: Math.round(savB/maxSav * 100) },
    { metric:"Weight",
      A: Math.round(detailA.weight * 8),
      B: Math.round(detailB.weight * 8) },
    { metric:"Data points",
      A: Math.min(Math.round((detailA.recent_count??0)/2), 100),
      B: Math.min(Math.round((detailB.recent_count??0)/2), 100) },
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
    const [o,d] = routeA.split("-")
    setLoadingA(true)
    fetchRouteDetail(o, d)
      .then(setDetailA)
      .catch(console.error)
      .finally(() => setLoadingA(false))
  }, [routeA])

  // Load detail for route B
  useEffect(() => {
    const [o,d] = routeB.split("-")
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
    if (key === "avg_t7")
      return curve.find(l => l.advance_days===7)?.avg_fare
    if (key === "avg_t1")
      return curve.find(l => l.advance_days===1)?.avg_fare
    if (key === "avg_t15")
      return curve.find(l => l.advance_days===15)?.avg_fare
    if (key === "min")
      return curve.length ? Math.min(...curve.map(l=>l.min_fare)) : null
    if (key === "max")
      return curve.length ? Math.max(...curve.map(l=>l.max_fare)) : null
    if (key === "savings") {
      const t1  = curve.find(l=>l.advance_days===1)?.avg_fare
      const t15 = curve.find(l=>l.advance_days===15)?.avg_fare
      return t1 && t15 ? Math.round((t1-t15)/t1*100) : null
    }
    if (key === "weight")   return detail.weight
    if (key === "samples")  return detail.recent_count
    return null
  }

  const fmt  = v => v ? `₹${Math.round(v).toLocaleString("en-IN")}` : "—"
  const fmtP = v => v ? `${v}%` : "—"

  const radarData = buildRadarData(detailA, detailB)

  // Combined lead time chart data
  const combinedLead = (() => {
    const curveA = detailA?.lead_time_curve ?? []
    const curveB = detailB?.lead_time_curve ?? []
    const windows = [1, 7, 15, 30, 45]
    return windows.map(w => ({
      window: w,
      [routeA]: curveA.find(l=>l.advance_days===w)?.avg_fare,
      [routeB]: curveB.find(l=>l.advance_days===w)?.avg_fare,
    }))
  })()

  const tabs = [
    { key:"overview",    label:"Overview"      },
    { key:"leadtime",    label:"Lead-time"     },
    { key:"range",       label:"Fare Range"    },
    { key:"radar",       label:"Radar"         },
  ]

  return (
    <div style={{ maxWidth:1200, margin:"0 auto",
                  padding:"40px 20px 80px" }}>

      {/* Header */}
      <div style={{ marginBottom:32 }}>
        <h1 style={{ fontSize:28, fontWeight:800,
                     color:colors.textPrimary,
                     letterSpacing:"-0.5px", marginBottom:8 }}>
          Route Comparison
        </h1>
        <p style={{ fontSize:14, color:colors.textSecondary }}>
          Compare two routes side by side ·
          Fares · Lead-time · Savings · Market data
        </p>
      </div>

      {/* Route selectors */}
      <GlassCard style={{ marginBottom:28, padding:24,
                          overflow:"visible" }}>
        <div style={{ display:"flex", gap:16,
                      alignItems:"flex-end", flexWrap:"wrap" }}>
          <RouteSelector value={routeA} onChange={setRouteA}
            label="Route A" exclude={routeB} />

          {/* VS badge */}
          <div style={{
            padding:"10px 16px", borderRadius:12,
            background:"rgba(59,130,246,0.12)",
            border:"1px solid rgba(59,130,246,0.25)",
            fontSize:14, fontWeight:800, color:colors.blue,
            flexShrink:0,
          }}>VS</div>

          <RouteSelector value={routeB} onChange={setRouteB}
            label="Route B" exclude={routeA} />
        </div>
      </GlassCard>

      {/* Route name headers */}
            <div style={{ display:"grid",
                    gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",
                    gap:16, marginBottom:20 }}>
        {[
          { route:routeA, color:colors.blue,   detail:detailA },
          { route:routeB, color:colors.purple, detail:detailB },
        ].map((item,i) => (
          <GlassCard key={i}
            style={{ borderTop:`3px solid ${item.color}`,
                     padding:"16px 20px" }}>
            <div style={{ fontSize:22, fontWeight:900,
                          color:colors.textPrimary,
                          fontFamily:"monospace",
                          letterSpacing:"-0.5px" }}>
              {item.route.replace("-"," → ")}
            </div>
            <div style={{ fontSize:13, color:colors.textSecondary,
                          marginTop:4 }}>
              {ROUTE_NAMES[item.route]}
            </div>
            {item.detail && (
              <div style={{ fontSize:12, color:item.color,
                            marginTop:8, fontWeight:600 }}>
                Weight: {item.detail.weight}% ·{" "}
                {item.detail.recent_count} fares collected
              </div>
            )}
          </GlassCard>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:8,
                    marginBottom:24, flexWrap:"wrap" }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              padding:"9px 18px", borderRadius:10,
              border:"none", cursor:"pointer",
              fontSize:13, fontWeight:500,
              background: tab===t.key
                ? "linear-gradient(135deg,#3b82f6,#1d4ed8)"
                : "rgba(255,255,255,0.05)",
              color: tab===t.key ? "#fff" : colors.textSecondary,
              boxShadow: tab===t.key
                ? "0 4px 12px rgba(59,130,246,0.3)" : "none",
              transition:"all 0.15s",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview tab ─────────────────────────────────────────────────── */}
      {tab === "overview" && (
        <div style={{ display:"flex", flexDirection:"column",
                      gap:20 }}>

          {/* Metrics comparison */}
          <GlassCard>
            <div style={{ fontSize:15, fontWeight:700,
                          color:colors.textPrimary,
                          marginBottom:20 }}>
              Head-to-head Metrics
            </div>

            {/* Column headers */}
            <div style={{ display:"grid",
                          gridTemplateColumns:"1fr auto 1fr",
                          marginBottom:8 }}>
              <div style={{ textAlign:"right", fontSize:13,
                            fontWeight:700, color:colors.blue,
                            fontFamily:"monospace" }}>
                {routeA}
              </div>
              <div style={{ width:120 }} />
              <div style={{ fontSize:13, fontWeight:700,
                            color:colors.purple,
                            fontFamily:"monospace" }}>
                {routeB}
              </div>
            </div>

            {loadingA || loadingB ? (
              <Skeleton h={200} radius={8} />
            ) : (
              <div>
                {[
                  { label:"Avg fare (T+7)", key:"avg_t7",
                    format:fmt, higherIsBetter:false },
                  { label:"Last-minute (T+1)", key:"avg_t1",
                    format:fmt, higherIsBetter:false },
                  { label:"Best price (T+15)", key:"avg_t15",
                    format:fmt, higherIsBetter:false },
                  { label:"Minimum ever seen", key:"min",
                    format:fmt, higherIsBetter:false },
                  { label:"Maximum seen", key:"max",
                    format:fmt, higherIsBetter:false },
                  { label:"Savings (T+1→T+15)", key:"savings",
                    format:fmtP, higherIsBetter:true },
                  { label:"Index weight", key:"weight",
                    format:v=>`${v}%`, higherIsBetter:true },
                  { label:"Fares collected", key:"samples",
                    format:v=>v, higherIsBetter:true },
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
          </GlassCard>

          {/* Verdict */}
          {detailA && detailB && (() => {
            const aAvg = getMetric(detailA, "avg_t7") ?? Infinity
            const bAvg = getMetric(detailB, "avg_t7") ?? Infinity
            const cheaperRoute = aAvg <= bAvg ? routeA : routeB
            const cheaperName  = ROUTE_NAMES[cheaperRoute]
            const diff = Math.abs(aAvg - bAvg)
            const pct  = Math.round(diff / Math.max(aAvg,bAvg) * 100)

            return (
              <GlassCard style={{
                background:"rgba(59,130,246,0.06)",
                border:"1px solid rgba(59,130,246,0.2)",
              }}>
                <div style={{ fontSize:16, fontWeight:700,
                              color:colors.textPrimary,
                              marginBottom:8 }}>
                  🏆 Verdict
                </div>
                <div style={{ fontSize:14, color:colors.textSecondary,
                              lineHeight:1.8 }}>
                  <strong style={{ color:colors.blue }}>
                    {cheaperRoute}
                  </strong>{" "}
                  ({cheaperName}) is the cheaper corridor,
                  averaging{" "}
                  <strong style={{ color:colors.green }}>
                    {pct}% less
                  </strong>{" "}
                  than {cheaperRoute===routeA ? routeB : routeA}.
                  {getMetric(detailA,"savings") !== null && (
                    <> Both routes offer meaningful savings
                    by booking 15 days ahead —{" "}
                    <strong style={{ color:colors.green }}>
                      {routeA}: {getMetric(detailA,"savings")}%,{" "}
                      {routeB}: {getMetric(detailB,"savings")}%
                    </strong>
                    .</>
                  )}
                </div>
              </GlassCard>
            )
          })()}
        </div>
      )}

      {/* ── Lead-time tab ─────────────────────────────────────────────────── */}
      {tab === "leadtime" && (
        <GlassCard>
          <div style={{ fontSize:15, fontWeight:700,
                        color:colors.textPrimary, marginBottom:6 }}>
            Lead-time Elasticity — Side by Side
          </div>
          <div style={{ fontSize:12, color:colors.textSecondary,
                        marginBottom:16 }}>
            How avg base fare changes with advance booking window
          </div>

          {/* Legend */}
          <div style={{ display:"flex", gap:20, marginBottom:20 }}>
            {[
              { route:routeA, color:colors.blue   },
              { route:routeB, color:colors.purple },
            ].map(item => (
              <div key={item.route}
                   style={{ display:"flex", alignItems:"center",
                             gap:6, fontSize:12,
                             color:colors.textSecondary }}>
                <span style={{ width:20, height:2.5,
                               background:item.color,
                               display:"inline-block",
                               borderRadius:1 }} />
                {item.route}
              </div>
            ))}
          </div>

          {loadingA || loadingB ? (
            <Skeleton h={280} radius={8} />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={combinedLead}
                margin={{ top:10, right:10, left:-10, bottom:0 }}>
                <defs>
                  <linearGradient id="gradA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={colors.blue}   stopOpacity={0.2}/>
                    <stop offset="95%" stopColor={colors.blue}   stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gradB" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={colors.purple} stopOpacity={0.2}/>
                    <stop offset="95%" stopColor={colors.purple} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3"
                               stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="window"
                       tickFormatter={v => `T+${v}`}
                       tick={{ fontSize:11, fill:colors.textMuted }}
                       axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:10, fill:colors.textMuted }}
                       tickFormatter={v => `₹${(v/1000).toFixed(1)}k`}
                       axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v, name) => [
                    `₹${Math.round(v).toLocaleString("en-IN")}`, name
                  ]}
                  labelFormatter={l => `T+${l} days advance`}
                  contentStyle={{ ...glass.strong,
                                  borderRadius:12, border:"none" }}
                />
                <Line type="monotone" dataKey={routeA}
                      stroke={colors.blue} strokeWidth={2.5}
                      dot={{ r:5, fill:colors.blue,
                             stroke:"#0d1528", strokeWidth:2 }} />
                <Line type="monotone" dataKey={routeB}
                      stroke={colors.purple} strokeWidth={2.5}
                      dot={{ r:5, fill:colors.purple,
                             stroke:"#0d1528", strokeWidth:2 }} />
              </LineChart>
            </ResponsiveContainer>
          )}

          {/* Crossover analysis */}
          {detailA && detailB && (() => {
            const windows = [1, 7, 15, 30, 45]
            const crossovers = windows.filter(w => {
              const aFare = detailA.lead_time_curve
                ?.find(l=>l.advance_days===w)?.avg_fare
              const bFare = detailB.lead_time_curve
                ?.find(l=>l.advance_days===w)?.avg_fare
              if (!aFare || !bFare) return false
              const prevW = windows[windows.indexOf(w)-1]
              if (!prevW) return false
              const aPrev = detailA.lead_time_curve
                ?.find(l=>l.advance_days===prevW)?.avg_fare
              const bPrev = detailB.lead_time_curve
                ?.find(l=>l.advance_days===prevW)?.avg_fare
              if (!aPrev || !bPrev) return false
              return (aFare > bFare) !== (aPrev > bPrev)
            })

            return crossovers.length > 0 ? (
              <div style={{ marginTop:16, padding:"12px 16px",
                            background:"rgba(245,158,11,0.08)",
                            border:"1px solid rgba(245,158,11,0.2)",
                            borderRadius:10, fontSize:12,
                            color:colors.textSecondary }}>
                💡 The curves cross at{" "}
                <strong style={{ color:colors.amber }}>
                  T+{crossovers[0]}
                </strong>{" "}
                — meaning the cheaper route switches at that booking window.
              </div>
            ) : null
          })()}
        </GlassCard>
      )}

      {/* ── Fare Range tab ────────────────────────────────────────────────── */}
      {tab === "range" && (
                <div style={{ display:"grid",
                      gridTemplateColumns:"repeat(auto-fit,minmax(min(320px,100%),1fr))",
                      gap:20 }}>
          {[
            { route:routeA, detail:detailA,
              loading:loadingA, color:colors.blue   },
            { route:routeB, detail:detailB,
              loading:loadingB, color:colors.purple },
          ].map(item => (
            <GlassCard key={item.route}
              style={{ borderTop:`2px solid ${item.color}` }}>
              <div style={{ fontSize:15, fontWeight:700,
                            color:item.color,
                            fontFamily:"monospace",
                            marginBottom:4 }}>
                {item.route}
              </div>
              <div style={{ fontSize:12, color:colors.textSecondary,
                            marginBottom:16 }}>
                Min · Avg · Max fare by advance window
              </div>
              {item.loading ? (
                <Skeleton h={240} radius={8} />
              ) : (
                <FareRangeChart
                  data={item.detail?.lead_time_curve ?? []}
                  height={240}
                />
              )}
            </GlassCard>
          ))}
        </div>
      )}

      {/* ── Radar tab ─────────────────────────────────────────────────────── */}
      {tab === "radar" && (
        <GlassCard>
          <div style={{ fontSize:15, fontWeight:700,
                        color:colors.textPrimary, marginBottom:6 }}>
            Route Profile Radar
          </div>
          <div style={{ fontSize:12, color:colors.textSecondary,
                        marginBottom:20 }}>
            Normalised scores across 5 dimensions ·
            Higher = better on each axis
          </div>

          {loadingA || loadingB ? (
            <Skeleton h={360} radius={8} />
          ) : (
            <ResponsiveContainer width="100%" height={360}>
              <RadarChart data={radarData}
                margin={{ top:20, right:40, left:40, bottom:20 }}>
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis dataKey="metric"
                  tick={{ fontSize:12,
                          fill:colors.textSecondary }} />
                <Radar name={routeA} dataKey="A"
                  stroke={colors.blue} fill={colors.blue}
                  fillOpacity={0.2} strokeWidth={2} />
                <Radar name={routeB} dataKey="B"
                  stroke={colors.purple} fill={colors.purple}
                  fillOpacity={0.2} strokeWidth={2} />
                <Legend
                  formatter={v => (
                    <span style={{ fontSize:12,
                                   color:colors.textSecondary }}>
                      {v}
                    </span>
                  )}
                />
                <Tooltip
                  contentStyle={{ ...glass.strong,
                                  borderRadius:12, border:"none" }}
                />
              </RadarChart>
            </ResponsiveContainer>
          )}

          <div style={{ display:"grid",
                        gridTemplateColumns:"1fr 1fr",
                        gap:12, marginTop:20 }}>
            {radarData.map(d => (
              <div key={d.metric} style={{
                background:"rgba(255,255,255,0.03)",
                border:`1px solid ${colors.border}`,
                borderRadius:10, padding:"12px 14px",
              }}>
                <div style={{ fontSize:11, color:colors.textMuted,
                              marginBottom:8 }}>{d.metric}</div>
                <div style={{ display:"flex", gap:12,
                              alignItems:"center" }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex",
                                  justifyContent:"space-between",
                                  marginBottom:4, fontSize:12 }}>
                      <span style={{ color:colors.blue }}>{routeA}</span>
                      <span style={{ color:colors.blue,
                                     fontWeight:600 }}>{d.A}</span>
                    </div>
                    <div style={{ height:4, borderRadius:2,
                                  background:"rgba(255,255,255,0.06)" }}>
                      <div style={{ height:"100%",
                                    width:`${d.A}%`,
                                    background:colors.blue,
                                    borderRadius:2 }} />
                    </div>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex",
                                  justifyContent:"space-between",
                                  marginBottom:4, fontSize:12 }}>
                      <span style={{ color:colors.purple }}>{routeB}</span>
                      <span style={{ color:colors.purple,
                                     fontWeight:600 }}>{d.B}</span>
                    </div>
                    <div style={{ height:4, borderRadius:2,
                                  background:"rgba(255,255,255,0.06)" }}>
                      <div style={{ height:"100%",
                                    width:`${d.B}%`,
                                    background:colors.purple,
                                    borderRadius:2 }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  )
}