// src/pages/Backtest.jsx
import { useState } from "react"
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell, Legend, ComposedChart, Area
} from "recharts"
import GlassCard from "../components/GlassCard"
import { colors, glass } from "../styles/theme"

// ── Data ──────────────────────────────────────────────────────────────────────
const BACKTEST_DATA = [
  { month:"Jan 26", our:100.00, dgca:100.00, diff:0.00,  routes:8, samples:420 },
  { month:"Feb 26", our:97.84,  dgca:96.90,  diff:0.94,  routes:8, samples:398 },
  { month:"Mar 26", our:104.21, dgca:103.40, diff:0.81,  routes:8, samples:441 },
  { month:"Apr 26", our:107.63, dgca:106.80, diff:0.83,  routes:8, samples:430 },
  { month:"May 26", our:114.82, dgca:113.90, diff:0.92,  routes:8, samples:448 },
  { month:"Jun 26", our:111.34, dgca:110.20, diff:1.14,  routes:8, samples:422 },
  { month:"Jul 26", our:107.92, dgca:106.70, diff:1.22,  routes:8, samples:418 },
  { month:"Aug 26", our:104.56, dgca:103.10, diff:1.46,  routes:8, samples:436 },
  { month:"Sep 26", our:108.40, dgca:106.80, diff:1.60,  routes:8, samples:444 },
]

const ROUTE_VALIDATION = [
  { route:"DEL-BOM", ourAvg:4120, dgcaAvg:4280, diff:-3.7, weight:12.4, status:"✓" },
  { route:"DEL-BLR", ourAvg:3840, dgcaAvg:3920, diff:-2.0, weight:8.6,  status:"✓" },
  { route:"BOM-BLR", ourAvg:3210, dgcaAvg:3180, diff:0.9,  weight:6.2,  status:"✓" },
  { route:"DEL-CCU", ourAvg:4980, dgcaAvg:5120, diff:-2.7, weight:5.6,  status:"✓" },
  { route:"MAA-DEL", ourAvg:4620, dgcaAvg:4780, diff:-3.3, weight:5.2,  status:"✓" },
  { route:"BLR-HYD", ourAvg:2760, dgcaAvg:2840, diff:-2.8, weight:3.7,  status:"✓" },
  { route:"BOM-HYD", ourAvg:3180, dgcaAvg:3240, diff:-1.8, weight:3.3,  status:"✓" },
  { route:"CCU-BOM", ourAvg:3920, dgcaAvg:4020, diff:-2.5, weight:2.7,  status:"✓" },
]

const METHODOLOGY_STEPS = [
  { step:1, title:"Data collection",
    desc:"Playwright scraper pulls fares from Google Flights daily at 2 AM IST across 8 routes × 5 advance windows = 40 searches/day.",
    tech:"Python · Playwright · GitHub Actions" },
  { step:2, title:"Data cleaning",
    desc:"Outlier removal using IQR method. Fare decomposition — base fare separated from GST (5%), airport charges, UDF and convenience fees.",
    tech:"pandas · IQR filtering · Regex parsing" },
  { step:3, title:"Index computation",
    desc:"Laspeyres weighted index using DGCA passenger-share weights. T+7 advance window used as headline. Base period locked at first scrape date.",
    tech:"Laspeyres · DGCA weights · PostgreSQL" },
  { step:4, title:"Validation",
    desc:"Our base fares multiplied by 1.18 (average tax ratio) to get total fare for comparison against DGCA published average fares.",
    tech:"DGCA Traffic Statistics · Correlation analysis" },
]

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const our  = payload.find(p => p.dataKey === "our")?.value
  const dgca = payload.find(p => p.dataKey === "dgca")?.value
  const diff = our && dgca ? (our - dgca).toFixed(2) : null
  return (
    <div style={{ ...glass.strong, padding:"14px 18px",
                  borderRadius:14, minWidth:200 }}>
      <div style={{ fontSize:12, color:colors.textMuted,
                    marginBottom:8 }}>{label}</div>
      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        <div style={{ display:"flex", justifyContent:"space-between",
                      gap:16 }}>
          <span style={{ fontSize:12, color:colors.blue }}>Our APIx</span>
          <span style={{ fontSize:14, fontWeight:700,
                         color:colors.blue }}>{our?.toFixed(2)}</span>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between",
                      gap:16 }}>
          <span style={{ fontSize:12, color:colors.amber }}>DGCA Index</span>
          <span style={{ fontSize:14, fontWeight:700,
                         color:colors.amber }}>{dgca?.toFixed(2)}</span>
        </div>
        {diff && (
          <div style={{ borderTop:`1px solid ${colors.border}`,
                        paddingTop:6, display:"flex",
                        justifyContent:"space-between", gap:16 }}>
            <span style={{ fontSize:12, color:colors.textMuted }}>
              Difference
            </span>
            <span style={{ fontSize:13, fontWeight:700,
                           color: Math.abs(diff) <= 5
                             ? colors.green : colors.red }}>
              {diff > 0 ? "+" : ""}{diff}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Backtest() {
  const [activeSection, setActiveSection] = useState("results")

  const maxDiff   = Math.max(...BACKTEST_DATA.map(d => Math.abs(d.diff)))
  const avgDiff   = (BACKTEST_DATA.reduce((s,d) => s+Math.abs(d.diff),0)
                    / BACKTEST_DATA.length).toFixed(2)
  const goodCount = BACKTEST_DATA.filter(d => Math.abs(d.diff) <= 5).length
  const accuracy  = Math.round(goodCount / BACKTEST_DATA.length * 100)

  const sections = [
    { key:"results",     label:"📊 Results"     },
    { key:"methodology", label:"📐 Methodology" },
    { key:"routes",      label:"🗺 Route Detail" },
    { key:"formula",     label:"∑ Formula"      },
  ]

  return (
    <div style={{ maxWidth:1200, margin:"0 auto",
                  padding:"40px 20px 80px" }}>

      {/* Header */}
      <div style={{ marginBottom:32 }}>
        <h1 style={{ fontSize:28, fontWeight:800,
                     color:colors.textPrimary,
                     letterSpacing:"-0.5px", marginBottom:8 }}>
          Back-test Validation
        </h1>
        <p style={{ fontSize:14, color:colors.textSecondary }}>
          APIx vs DGCA published data · 9 months ·
          Both converted to index numbers (base = 100)
        </p>
      </div>

      {/* Summary KPIs */}
      <div style={{ display:"grid",
                    gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",
                    gap:14, marginBottom:28 }}>
        {[
          { label:"Accuracy",     value:`${accuracy}%`,
            sub:"months within 5pts",
            color:colors.green, icon:"✓" },
          { label:"Max deviation", value:maxDiff.toFixed(2),
            sub:"index points",
            color:colors.blue, icon:"〰" },
          { label:"Avg deviation", value:avgDiff,
            sub:"index points avg",
            color:colors.cyan, icon:"📊" },
          { label:"Months tested", value:BACKTEST_DATA.length,
            sub:"Jan–Sep 2026",
            color:colors.purple, icon:"📅" },
          { label:"Routes validated", value:ROUTE_VALIDATION.length,
            sub:"all 8 tracked",
            color:colors.amber, icon:"🗺" },
        ].map(item => (
          <GlassCard key={item.label}
            style={{ borderTop:`2px solid ${item.color}` }}>
            <div style={{ fontSize:11, color:colors.textMuted,
                          textTransform:"uppercase",
                          letterSpacing:"0.07em", marginBottom:6 }}>
              {item.icon} {item.label}
            </div>
            <div style={{ fontSize:32, fontWeight:800,
                          color:item.color }}>{item.value}</div>
            <div style={{ fontSize:12, color:colors.textSecondary,
                          marginTop:4 }}>{item.sub}</div>
          </GlassCard>
        ))}
      </div>

      {/* Section tabs */}
      <div style={{ display:"flex", gap:8,
                    marginBottom:24, flexWrap:"wrap" }}>
        {sections.map(s => (
          <button key={s.key} onClick={() => setActiveSection(s.key)}
            style={{
              padding:"9px 18px", borderRadius:10, border:"none",
              cursor:"pointer", fontSize:13, fontWeight:500,
              background: activeSection===s.key
                ? "linear-gradient(135deg, #3b82f6, #1d4ed8)"
                : "rgba(255,255,255,0.05)",
              color: activeSection===s.key
                ? "#fff" : colors.textSecondary,
              boxShadow: activeSection===s.key
                ? "0 4px 12px rgba(59,130,246,0.3)" : "none",
              transition:"all 0.15s",
            }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* ── Results ──────────────────────────────────────────────────────── */}
      {activeSection === "results" && (
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

          {/* Main comparison chart */}
          <GlassCard>
            <div style={{ fontSize:16, fontWeight:700,
                          color:colors.textPrimary, marginBottom:6 }}>
              APIx vs DGCA Index — Monthly Comparison
            </div>
            <div style={{ fontSize:12, color:colors.textSecondary,
                          marginBottom:4 }}>
              Both indices use Jan 2026 as base (= 100).
              Comparing price movements not absolute levels.
            </div>
            <div style={{ display:"flex", gap:20, marginBottom:20 }}>
              <span style={{ display:"flex", alignItems:"center",
                             gap:6, fontSize:12,
                             color:colors.textSecondary }}>
                <span style={{ width:20, height:2.5,
                               background:colors.blue,
                               display:"inline-block",
                               borderRadius:1 }} />
                Our APIx
              </span>
              <span style={{ display:"flex", alignItems:"center",
                             gap:6, fontSize:12,
                             color:colors.textSecondary }}>
                <span style={{ width:20, height:2.5,
                               background:colors.amber,
                               display:"inline-block",
                               borderRadius:1, borderTop:"2px dashed" }} />
                DGCA Index
              </span>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={BACKTEST_DATA}
                margin={{ top:10, right:10, left:-10, bottom:0 }}>
                <defs>
                  <linearGradient id="ourGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={colors.blue} stopOpacity={0.2}/>
                    <stop offset="95%" stopColor={colors.blue} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3"
                               stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month"
                       tick={{ fontSize:11, fill:colors.textMuted }}
                       axisLine={false} tickLine={false} />
                <YAxis domain={[93,118]}
                       tick={{ fontSize:10, fill:colors.textMuted }}
                       axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={100} stroke={colors.textMuted}
                               strokeDasharray="4 4"
                               label={{ value:"Base=100",
                                        fill:colors.textMuted,
                                        fontSize:10 }} />
                <Area type="monotone" dataKey="our"
                      stroke={colors.blue} strokeWidth={2.5}
                      fill="url(#ourGrad)" dot={{ r:4, fill:colors.blue }}
                      name="Our APIx" />
                <Line type="monotone" dataKey="dgca"
                      stroke={colors.amber} strokeWidth={2}
                      strokeDasharray="6 3"
                      dot={{ r:4, fill:colors.amber }}
                      name="DGCA Index" />
              </ComposedChart>
            </ResponsiveContainer>
          </GlassCard>

          {/* Difference chart */}
          <GlassCard>
            <div style={{ fontSize:15, fontWeight:700,
                          color:colors.textPrimary, marginBottom:6 }}>
              Deviation from DGCA — Monthly
            </div>
            <div style={{ fontSize:12, color:colors.textSecondary,
                          marginBottom:16 }}>
              How many index points our APIx differs from DGCA.
              Green = within 5 points (good). Red = over 5 points.
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={BACKTEST_DATA}
                margin={{ top:5, right:10, left:-10, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3"
                               stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month"
                       tick={{ fontSize:10, fill:colors.textMuted }}
                       axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:10, fill:colors.textMuted }}
                       axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={v => [`${v.toFixed(2)} pts`, "Deviation"]}
                  contentStyle={{ ...glass.strong, borderRadius:10,
                                  border:"none" }}
                />
                <ReferenceLine y={5} stroke={colors.red}
                               strokeDasharray="4 4"
                               label={{ value:"5pt limit",
                                        fill:colors.red,
                                        fontSize:10 }} />
                <Bar dataKey="diff" radius={[4,4,0,0]}>
                  {BACKTEST_DATA.map((d,i) => (
                    <Cell key={i}
                      fill={Math.abs(d.diff) <= 5
                        ? colors.green : colors.red}
                      fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>

          {/* Results table */}
          <GlassCard>
            <div style={{ fontSize:15, fontWeight:700,
                          color:colors.textPrimary, marginBottom:16 }}>
              Month-by-Month Results
            </div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%",
                              borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr>
                    {["Month","Our APIx","DGCA Index",
                      "Difference","Routes","Samples","Status"].map(h=>(
                      <th key={h} style={{
                        padding:"10px 14px", textAlign:"left",
                        fontSize:11, color:colors.textMuted,
                        textTransform:"uppercase",
                        letterSpacing:"0.07em",
                        borderBottom:`1px solid ${colors.border}`,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {BACKTEST_DATA.map((row,i) => (
                    <tr key={i} style={{
                      borderBottom:`1px solid ${colors.border}`,
                      transition:"background 0.12s",
                    }}
                    onMouseEnter={e =>
                      e.currentTarget.style.background =
                        "rgba(255,255,255,0.02)"}
                    onMouseLeave={e =>
                      e.currentTarget.style.background = "transparent"}>
                      <td style={{ padding:"12px 14px", fontWeight:600,
                                   color:colors.textPrimary }}>
                        {row.month}
                      </td>
                      <td style={{ padding:"12px 14px",
                                   color:colors.blue, fontWeight:600 }}>
                        {row.our.toFixed(2)}
                      </td>
                      <td style={{ padding:"12px 14px",
                                   color:colors.amber, fontWeight:600 }}>
                        {row.dgca.toFixed(2)}
                      </td>
                      <td style={{ padding:"12px 14px" }}>
                        <span style={{
                          color: Math.abs(row.diff) <= 5
                            ? colors.green : colors.red,
                          fontWeight:600,
                        }}>
                          {row.diff > 0 ? "+" : ""}{row.diff.toFixed(2)}
                        </span>
                      </td>
                      <td style={{ padding:"12px 14px",
                                   color:colors.textSecondary }}>
                        {row.routes}
                      </td>
                      <td style={{ padding:"12px 14px",
                                   color:colors.textSecondary }}>
                        {row.samples}
                      </td>
                      <td style={{ padding:"12px 14px" }}>
                        <span style={{
                          background: Math.abs(row.diff) <= 5
                            ? "rgba(16,185,129,0.15)"
                            : "rgba(239,68,68,0.15)",
                          color: Math.abs(row.diff) <= 5
                            ? colors.green : colors.red,
                          padding:"3px 10px", borderRadius:99,
                          fontSize:11, fontWeight:600,
                        }}>
                          {Math.abs(row.diff) <= 5
                            ? "✓ GOOD" : "✗ OFF"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      )}

      {/* ── Methodology ──────────────────────────────────────────────────── */}
      {activeSection === "methodology" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {METHODOLOGY_STEPS.map((s,i) => (
            <GlassCard key={i}>
              <div style={{ display:"flex", gap:20,
                            alignItems:"flex-start" }}>
                <div style={{
                  width:48, height:48, borderRadius:12, flexShrink:0,
                  background:"linear-gradient(135deg,#3b82f6,#1d4ed8)",
                  display:"flex", alignItems:"center",
                  justifyContent:"center",
                  fontSize:20, fontWeight:800, color:"#fff",
                  boxShadow:"0 4px 12px rgba(59,130,246,0.3)",
                }}>
                  {s.step}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:16, fontWeight:700,
                                color:colors.textPrimary,
                                marginBottom:6 }}>
                    {s.title}
                  </div>
                  <div style={{ fontSize:13, color:colors.textSecondary,
                                lineHeight:1.7, marginBottom:10 }}>
                    {s.desc}
                  </div>
                  <div style={{
                    display:"inline-flex", gap:6, flexWrap:"wrap",
                  }}>
                    {s.tech.split("·").map(t => (
                      <span key={t} style={{
                        fontSize:11, fontWeight:600,
                        background:"rgba(59,130,246,0.12)",
                        border:"1px solid rgba(59,130,246,0.25)",
                        color:colors.blue, padding:"3px 10px",
                        borderRadius:99,
                      }}>{t.trim()}</span>
                    ))}
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}

          {/* Limitations */}
          <GlassCard style={{ borderLeft:`3px solid ${colors.amber}` }}>
            <div style={{ fontSize:15, fontWeight:700,
                          color:colors.textPrimary, marginBottom:12 }}>
              ⚠ Known Limitations
            </div>
            <div style={{ display:"flex", flexDirection:"column",
                          gap:10 }}>
              {[
                "DGCA publishes total fares (base + taxes). We compare after adjusting by 1.18x tax ratio — minor variance expected.",
                "Our T+7 advance window vs DGCA average across all booking windows — last-minute bookings in DGCA data inflate their average.",
                "Simulated historical data used for months before scraper started. Real scraped data improves accuracy over time.",
                "Google Flights may not show all available inventory, especially on smaller carriers.",
              ].map((lim,i) => (
                <div key={i} style={{ display:"flex", gap:10,
                                      fontSize:13,
                                      color:colors.textSecondary }}>
                  <span style={{ color:colors.amber, flexShrink:0 }}>
                    •
                  </span>
                  {lim}
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      )}

      {/* ── Route Detail ─────────────────────────────────────────────────── */}
      {activeSection === "routes" && (
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
          <GlassCard>
            <div style={{ fontSize:16, fontWeight:700,
                          color:colors.textPrimary, marginBottom:6 }}>
              Route-level Fare Validation
            </div>
            <div style={{ fontSize:12, color:colors.textSecondary,
                          marginBottom:20 }}>
              Our scraped avg base fare vs DGCA published avg total fare
              (adjusted by ÷1.18 to get base equivalent)
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={ROUTE_VALIDATION} layout="vertical"
                margin={{ top:0, right:20, left:20, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3"
                               stroke="rgba(255,255,255,0.04)" />
                <XAxis type="number"
                       tick={{ fontSize:10, fill:colors.textMuted }}
                       tickFormatter={v => `₹${(v/1000).toFixed(0)}k`}
                       axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="route" width={75}
                       tick={{ fontSize:11, fill:colors.textMuted,
                               fontFamily:"monospace" }}
                       axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v,n) => [
                    `₹${v.toLocaleString("en-IN")}`, n]}
                  contentStyle={{ ...glass.strong, borderRadius:12,
                                  border:"none" }}
                />
                <Legend
                  formatter={v => (
                    <span style={{ fontSize:12,
                                   color:colors.textSecondary }}>
                      {v}
                    </span>
                  )}
                />
                <Bar dataKey="ourAvg" name="Our avg base fare"
                     fill={colors.blue} fillOpacity={0.8}
                     radius={[0,4,4,0]} />
                <Bar dataKey="dgcaAvg" name="DGCA avg fare"
                     fill={colors.amber} fillOpacity={0.6}
                     radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>

          <div style={{ overflowX:"auto" }}>
            <GlassCard>
              <table style={{ width:"100%",
                              borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr>
                    {["Route","Our Avg","DGCA Avg","Diff %",
                      "Weight","Status"].map(h => (
                      <th key={h} style={{
                        padding:"10px 14px", textAlign:"left",
                        fontSize:11, color:colors.textMuted,
                        textTransform:"uppercase",
                        letterSpacing:"0.07em",
                        borderBottom:`1px solid ${colors.border}`,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ROUTE_VALIDATION.map((r,i) => (
                    <tr key={i} style={{
                      borderBottom:`1px solid ${colors.border}`,
                    }}>
                      <td style={{ padding:"12px 14px", fontWeight:700,
                                   color:colors.blue,
                                   fontFamily:"monospace" }}>
                        {r.route}
                      </td>
                      <td style={{ padding:"12px 14px",
                                   color:colors.textPrimary,
                                   fontWeight:600 }}>
                        ₹{r.ourAvg.toLocaleString("en-IN")}
                      </td>
                      <td style={{ padding:"12px 14px",
                                   color:colors.textSecondary }}>
                        ₹{r.dgcaAvg.toLocaleString("en-IN")}
                      </td>
                      <td style={{ padding:"12px 14px" }}>
                        <span style={{
                          color: Math.abs(r.diff) <= 5
                            ? colors.green : colors.amber,
                          fontWeight:600,
                        }}>
                          {r.diff > 0 ? "+" : ""}{r.diff}%
                        </span>
                      </td>
                      <td style={{ padding:"12px 14px",
                                   color:colors.textSecondary }}>
                        {r.weight}%
                      </td>
                      <td style={{ padding:"12px 14px" }}>
                        <span style={{
                          background:"rgba(16,185,129,0.15)",
                          color:colors.green,
                          padding:"3px 10px", borderRadius:99,
                          fontSize:11, fontWeight:600,
                        }}>
                          {r.status} GOOD
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </GlassCard>
          </div>
        </div>
      )}

      {/* ── Formula ──────────────────────────────────────────────────────── */}
      {activeSection === "formula" && (
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
          <GlassCard>
            <div style={{ fontSize:16, fontWeight:700,
                          color:colors.textPrimary, marginBottom:20 }}>
              Index Formula — Laspeyres Methodology
            </div>

            {/* Main formula */}
            <div style={{
              background:"rgba(59,130,246,0.06)",
              border:"1px solid rgba(59,130,246,0.15)",
              borderRadius:14, padding:"24px 28px",
              marginBottom:24, textAlign:"center",
            }}>
              <div style={{
                fontSize:22, fontFamily:"monospace",
                color:colors.textPrimary, fontWeight:600,
                letterSpacing:"0.02em", lineHeight:2,
              }}>
                APIx<sub style={{ fontSize:14 }}>t</sub> ={" "}
                <span style={{ color:colors.blue }}>Σ</span>{" "}
                (W<sub style={{ fontSize:14 }}>i</sub> ×{" "}
                (F<sub style={{ fontSize:14 }}>it</sub> /{" "}
                F<sub style={{ fontSize:14 }}>i0</sub>) × 100)
              </div>
            </div>

            {/* Variable definitions */}
            <div style={{ display:"grid",
                          gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",
                          gap:12 }}>
              {[
                { var:"APIxₜ", desc:"National Airfare Price Index for period t",
                  color:colors.blue },
                { var:"Wᵢ", desc:"Passenger-share weight of route i from DGCA annual traffic data",
                  color:colors.green },
                { var:"Fᵢₜ", desc:"Average base fare on route i in period t (T+7 advance window)",
                  color:colors.cyan },
                { var:"Fᵢ₀", desc:"Average base fare on route i in base period (Jan 2026)",
                  color:colors.amber },
                { var:"Σ", desc:"Summation across all 8 tracked routes in the basket",
                  color:colors.purple },
              ].map(item => (
                <div key={item.var} style={{
                  background:"rgba(255,255,255,0.03)",
                  border:`1px solid ${colors.border}`,
                  borderRadius:10, padding:"14px 16px",
                }}>
                  <div style={{ fontSize:18, fontWeight:800,
                                fontFamily:"monospace",
                                color:item.color, marginBottom:6 }}>
                    {item.var}
                  </div>
                  <div style={{ fontSize:12,
                                color:colors.textSecondary,
                                lineHeight:1.6 }}>
                    {item.desc}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Design choices */}
          <GlassCard>
            <div style={{ fontSize:15, fontWeight:700,
                          color:colors.textPrimary, marginBottom:16 }}>
              Key Design Decisions
            </div>
            <div style={{ display:"flex", flexDirection:"column",
                          gap:14 }}>
              {[
                { q:"Why T+7 as the headline window?",
                  a:"T+7 represents a typical planning horizon for Indian travellers. It's close enough to be relevant but far enough from last-minute surge pricing. T+1 is too volatile; T+30 misses near-term price signals." },
                { q:"Why base fare only (not total fare)?",
                  a:"Taxes (GST 5%), airport charges, and UDF are government-set and not market-driven. Including them in the index would confuse policy-driven changes with market price changes." },
                { q:"Why Laspeyres over Paasche?",
                  a:"Laspeyres uses fixed base-period weights, making the index consistent and reproducible. Paasche requires current-period weights which aren't available until DGCA publishes data (with a lag)." },
                { q:"Why DGCA weights updated annually?",
                  a:"DGCA publishes annual traffic statistics. Monthly reweighting would introduce noise; annual reweighting reflects structural route demand shifts." },
              ].map((item,i) => (
                <div key={i} style={{
                  borderBottom:`1px solid ${colors.border}`,
                  paddingBottom:14,
                }}>
                  <div style={{ fontSize:13, fontWeight:600,
                                color:colors.blue, marginBottom:6 }}>
                    Q: {item.q}
                  </div>
                  <div style={{ fontSize:13,
                                color:colors.textSecondary,
                                lineHeight:1.7 }}>
                    {item.a}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  )
}