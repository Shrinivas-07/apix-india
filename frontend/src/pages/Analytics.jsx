// src/pages/Analytics.jsx
import { useState, useEffect } from "react"
import {
  BarChart, Bar, LineChart, Line, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, PolarRadiusAxis, ZAxis, Legend
} from "recharts"
import GlassCard from "../components/GlassCard"
import Skeleton  from "../components/Skeleton"
import { fetchRoutes, fetchAnalyticsSummary } from "../api"
import { colors, glass } from "../styles/theme"

// ── Mock analytics data ───────────────────────────────────────────────────────
const DOW_DATA = [
  { day:"Mon", factor:1.08, label:"Monday",    cheap:false },
  { day:"Tue", factor:0.94, label:"Tuesday",   cheap:true  },
  { day:"Wed", factor:0.96, label:"Wednesday", cheap:true  },
  { day:"Thu", factor:1.02, label:"Thursday",  cheap:false },
  { day:"Fri", factor:1.14, label:"Friday",    cheap:false },
  { day:"Sat", factor:1.18, label:"Saturday",  cheap:false },
  { day:"Sun", factor:1.11, label:"Sunday",    cheap:false },
]

const FESTIVALS = [
  { name:"Diwali",       date:"Nov 1",   surge:42, routes:["DEL-BOM","DEL-BLR","BOM-BLR"], impact:"Very High" },
  { name:"Holi",         date:"Mar 14",  surge:28, routes:["DEL-BOM","DEL-CCU"],            impact:"High"      },
  { name:"Durga Puja",   date:"Oct 2",   surge:35, routes:["DEL-CCU","BOM-CCU","CCU-BOM"],  impact:"High"      },
  { name:"Eid",          date:"Mar 31",  surge:22, routes:["DEL-BOM","DEL-HYD"],            impact:"Medium"    },
  { name:"Christmas",    date:"Dec 25",  surge:31, routes:["DEL-GOI","BOM-GOI"],            impact:"High"      },
  { name:"New Year",     date:"Jan 1",   surge:38, routes:["DEL-GOI","BOM-GOI","DEL-BOM"],  impact:"Very High" },
  { name:"Pongal",       date:"Jan 14",  surge:18, routes:["MAA-DEL","MAA-BOM"],            impact:"Medium"    },
  { name:"Onam",         date:"Sep 5",   surge:20, routes:["DEL-COK","BOM-COK"],            impact:"Medium"    },
]

const ADVANCE_SAVINGS = [
  { window:"T+1",  avgFare:6200, saving:0,  label:"Last minute" },
  { window:"T+7",  avgFare:5100, saving:18, label:"1 week ahead" },
  { window:"T+15", avgFare:4200, saving:32, label:"2 weeks ahead" },
  { window:"T+30", avgFare:3850, saving:38, label:"1 month ahead" },
  { window:"T+45", avgFare:4050, saving:35, label:"6 weeks ahead" },
]

const MONTH_DATA = [
  { month:"Jan", index:98.2,  demand:"High",   label:"Post holiday dip" },
  { month:"Feb", index:96.4,  demand:"Low",    label:"Cheapest month"   },
  { month:"Mar", index:101.2, demand:"Medium", label:"Holi surge"       },
  { month:"Apr", index:103.4, demand:"Medium", label:"Summer begins"    },
  { month:"May", index:108.6, demand:"High",   label:"Peak summer"      },
  { month:"Jun", index:106.2, demand:"High",   label:"School holidays"  },
  { month:"Jul", index:99.8,  demand:"Low",    label:"Monsoon dip"      },
  { month:"Aug", index:98.4,  demand:"Low",    label:"Monsoon continues"},
  { month:"Sep", index:102.1, demand:"Medium", label:"Festive begins"   },
  { month:"Oct", index:108.9, demand:"High",   label:"Navratri/Puja"    },
  { month:"Nov", index:114.2, demand:"Very High", label:"Diwali peak"   },
  { month:"Dec", index:112.8, demand:"Very High", label:"Christmas/NYE" },
]

function generateCorrelation(routes) {
  return routes.flatMap((r1, i) =>
    routes.slice(i+1).map(r2 => ({
      route1: r1.route,
      route2: r2.route,
      correlation: +(0.4 + Math.random() * 0.55).toFixed(2),
      x: r1.avg_fare ?? 3800,
      y: r2.avg_fare ?? 3800,
      z: Math.abs(r1.change_pct ?? 2),
    }))
  )
}

// ── Saving calculator ─────────────────────────────────────────────────────────
function SavingsCalculator() {
  const [route,     setRoute]     = useState("DEL-BOM")
  const [passengers,setPassengers]= useState(1)
  const [window_,   setWindow]    = useState("T+15")

  const base    = { "DEL-BOM":6200,"DEL-BLR":5100,"BOM-BLR":4100,
                    "DEL-CCU":7200,"MAA-DEL":6800,"BLR-HYD":3400 }
  const savings = { "T+1":0,"T+7":18,"T+15":32,"T+30":38,"T+45":35 }

  const lastMin = (base[route] ?? 6200) * passengers
  const planned = Math.round(lastMin * (1 - savings[window_]/100))
  const saved   = lastMin - planned

  return (
    <GlassCard>
      <div style={{ fontSize:16, fontWeight:700,
                    color:colors.textPrimary, marginBottom:6 }}>
        💰 Advance Booking Savings Calculator
      </div>
      <div style={{ fontSize:12, color:colors.textSecondary,
                    marginBottom:20 }}>
        See how much you save by booking ahead
      </div>

      {/* Inputs */}
      <div style={{ display:"flex", gap:12,
                    flexWrap:"wrap", marginBottom:24 }}>
        <div style={{ flex:1, minWidth:140 }}>
          <div style={{ fontSize:11, color:colors.textMuted,
                        textTransform:"uppercase",
                        letterSpacing:"0.07em",
                        marginBottom:8 }}>Route</div>
          <select value={route} onChange={e => setRoute(e.target.value)}
            style={{
              width:"100%", background:"rgba(255,255,255,0.06)",
              border:`1px solid ${colors.border}`, borderRadius:10,
              padding:"10px 14px", color:colors.textPrimary,
              fontSize:14, outline:"none", cursor:"pointer",
            }}>
            {Object.keys(base).map(r => (
              <option key={r} value={r}
                style={{ background:"#0d1528" }}>{r}</option>
            ))}
          </select>
        </div>

        <div style={{ flex:1, minWidth:140 }}>
          <div style={{ fontSize:11, color:colors.textMuted,
                        textTransform:"uppercase",
                        letterSpacing:"0.07em",
                        marginBottom:8 }}>Book at</div>
          <select value={window_} onChange={e => setWindow(e.target.value)}
            style={{
              width:"100%", background:"rgba(255,255,255,0.06)",
              border:`1px solid ${colors.border}`, borderRadius:10,
              padding:"10px 14px", color:colors.textPrimary,
              fontSize:14, outline:"none", cursor:"pointer",
            }}>
            {Object.keys(savings).map(w => (
              <option key={w} value={w}
                style={{ background:"#0d1528" }}>{w}</option>
            ))}
          </select>
        </div>

        <div style={{ flex:1, minWidth:120 }}>
          <div style={{ fontSize:11, color:colors.textMuted,
                        textTransform:"uppercase",
                        letterSpacing:"0.07em",
                        marginBottom:8 }}>Passengers</div>
          <div style={{ display:"flex", alignItems:"center",
                        gap:10,
                        background:"rgba(255,255,255,0.06)",
                        border:`1px solid ${colors.border}`,
                        borderRadius:10, padding:"8px 14px" }}>
            <button onClick={() => setPassengers(Math.max(1,passengers-1))}
              style={{ background:"transparent", border:"none",
                       color:colors.textPrimary, cursor:"pointer",
                       fontSize:18, lineHeight:1 }}>−</button>
            <span style={{ flex:1, textAlign:"center", fontSize:16,
                           fontWeight:700, color:colors.textPrimary }}>
              {passengers}
            </span>
            <button onClick={() => setPassengers(Math.min(9,passengers+1))}
              style={{ background:"transparent", border:"none",
                       color:colors.textPrimary, cursor:"pointer",
                       fontSize:18, lineHeight:1 }}>+</button>
          </div>
        </div>
      </div>

      {/* Results */}
      <div style={{ display:"grid",
                    gridTemplateColumns:"repeat(3,1fr)",
                    gap:14 }}>
        {[
          { label:"Last-minute fare", value:`₹${lastMin.toLocaleString("en-IN")}`,
            sub:"T+1 booking", color:colors.red },
          { label:"If you book now",  value:`₹${planned.toLocaleString("en-IN")}`,
            sub:`${window_} advance`, color:colors.blue },
          { label:"You save",         value:`₹${saved.toLocaleString("en-IN")}`,
            sub:`${savings[window_]}% savings`, color:colors.green },
        ].map(item => (
          <div key={item.label} style={{
            background:`rgba(${item.color === colors.green ? "16,185,129"
                            : item.color === colors.red ? "239,68,68"
                            : "59,130,246"},0.08)`,
            border:`1px solid rgba(${item.color === colors.green ? "16,185,129"
                                   : item.color === colors.red ? "239,68,68"
                                   : "59,130,246"},0.2)`,
            borderRadius:12, padding:"16px 18px", textAlign:"center",
          }}>
            <div style={{ fontSize:10, color:colors.textMuted,
                          textTransform:"uppercase",
                          letterSpacing:"0.07em",
                          marginBottom:8 }}>
              {item.label}
            </div>
            <div style={{ fontSize:24, fontWeight:800,
                          color:item.color }}>
              {item.value}
            </div>
            <div style={{ fontSize:11, color:colors.textSecondary,
                          marginTop:4 }}>
              {item.sub}
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Analytics() {
  const [loading, setLoading] = useState(true)
  const [routes,  setRoutes]  = useState([])
  const [activeTab, setActiveTab] = useState("patterns")

    const [windowData, setWindowData] = useState([])

  useEffect(() => {
    async function load() {
      try {
        const [r, a] = await Promise.all([
          fetchRoutes(),
          fetchAnalyticsSummary(),
        ])
        setRoutes(r.routes || [])
        if (a.window_summary?.length > 0) {
          setWindowData(a.window_summary)
        }
      } catch (error) {
        console.error(error)
      }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const correlation = generateCorrelation(routes)

  const tabs = [
    { key:"patterns",   label:"📅 Day Patterns"      },
    { key:"seasonal",   label:"🗓 Seasonal Trends"   },
    { key:"festivals",  label:"🎉 Festival Surges"   },
    { key:"savings",    label:"💰 Savings Insights"  },
    { key:"correlation",label:"🔗 Route Correlation" },
  ]

  return (
    <div style={{ maxWidth:1200, margin:"0 auto",
                  padding:"40px 20px 80px" }}>

      {/* Header */}
      <div style={{ marginBottom:32 }}>
        <h1 style={{ fontSize:28, fontWeight:800,
                     color:colors.textPrimary,
                     letterSpacing:"-0.5px", marginBottom:8 }}>
          Analytics & Insights
        </h1>
        <p style={{ fontSize:14, color:colors.textSecondary }}>
          Deep patterns in Indian domestic airfare data ·
          Day-of-week · Seasonal · Festival surges · Savings
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:8,
                    marginBottom:28, flexWrap:"wrap" }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{
              padding:"9px 18px", borderRadius:10,
              border:"none", cursor:"pointer",
              fontSize:13, fontWeight:500,
              background: activeTab===t.key
                ? "linear-gradient(135deg, #3b82f6, #1d4ed8)"
                : "rgba(255,255,255,0.05)",
              color: activeTab===t.key ? "#fff" : colors.textSecondary,
              boxShadow: activeTab===t.key
                ? "0 4px 12px rgba(59,130,246,0.3)" : "none",
              transition:"all 0.15s",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Day Patterns ─────────────────────────────────────────────────── */}
      {activeTab === "patterns" && (
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
          <GlassCard>
            <div style={{ fontSize:16, fontWeight:700,
                          color:colors.textPrimary, marginBottom:6 }}>
              Day-of-Week Fare Patterns
            </div>
            <div style={{ fontSize:12, color:colors.textSecondary,
                          marginBottom:20 }}>
              Average fare multiplier by day · 1.0 = average ·
              Below 1.0 = cheaper
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={DOW_DATA}
                margin={{ top:10, right:10, left:-10, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3"
                               stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="day"
                       tick={{ fontSize:12, fill:colors.textMuted }}
                       axisLine={false} tickLine={false} />
                <YAxis domain={[0.8,1.3]}
                       tick={{ fontSize:10, fill:colors.textMuted }}
                       axisLine={false} tickLine={false}
                       tickFormatter={v => `${v}x`} />
                <Tooltip
                  formatter={(v,n,p) => [
                    `${(v*100-100).toFixed(0)}% ${v>1?"more":"less"} than avg`,
                    p.payload.label
                  ]}
                  contentStyle={{ ...glass.strong, borderRadius:12,
                                  border:"none" }}
                />
                <Bar dataKey="factor" radius={[6,6,0,0]}>
                  {DOW_DATA.map((d,i) => (
                    <Cell key={i}
                      fill={d.cheap ? colors.green : colors.red}
                      fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Insights */}
            <div style={{ display:"grid",
                          gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",
                          gap:12, marginTop:20 }}>
              {[
                { icon:"🟢", title:"Cheapest days",
                  body:"Tuesday and Wednesday fares are 6-8% below average. Book mid-week." },
                { icon:"🔴", title:"Most expensive",
                  body:"Friday and Saturday fares are 14-18% above average. Avoid if possible." },
                { icon:"💡", title:"Pro tip",
                  body:"Search on Tuesday, fly on Tuesday or Wednesday for best combined savings." },
              ].map(tip => (
                <div key={tip.title} style={{
                  background:"rgba(255,255,255,0.03)",
                  border:`1px solid ${colors.border}`,
                  borderRadius:12, padding:"14px 16px",
                }}>
                  <div style={{ fontSize:20, marginBottom:6 }}>
                    {tip.icon}
                  </div>
                  <div style={{ fontSize:13, fontWeight:600,
                                color:colors.textPrimary,
                                marginBottom:4 }}>
                    {tip.title}
                  </div>
                  <div style={{ fontSize:12, color:colors.textSecondary,
                                lineHeight:1.6 }}>
                    {tip.body}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Radar chart */}
          <GlassCard>
            <div style={{ fontSize:15, fontWeight:700,
                          color:colors.textPrimary, marginBottom:6 }}>
              Weekly Pattern Radar
            </div>
            <div style={{ fontSize:12, color:colors.textSecondary,
                          marginBottom:16 }}>
              Visualising relative fare pressure across the week
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={DOW_DATA}
                margin={{ top:10, right:20, left:20, bottom:10 }}>
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis dataKey="day"
                  tick={{ fontSize:12, fill:colors.textSecondary }} />
                <PolarRadiusAxis angle={90} domain={[0.8,1.3]}
                  tick={{ fontSize:9, fill:colors.textMuted }} />
                <Radar name="Fare factor" dataKey="factor"
                  stroke={colors.blue} fill={colors.blue}
                  fillOpacity={0.2} strokeWidth={2} />
                <Tooltip
                  formatter={v => [`${v.toFixed(2)}x`, "Fare factor"]}
                  contentStyle={{ ...glass.strong, borderRadius:12,
                                  border:"none" }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </GlassCard>
        </div>
      )}

      {/* ── Seasonal Trends ───────────────────────────────────────────────── */}
      {activeTab === "seasonal" && (
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
          <GlassCard>
            <div style={{ fontSize:16, fontWeight:700,
                          color:colors.textPrimary, marginBottom:6 }}>
              Monthly APIx Seasonal Pattern
            </div>
            <div style={{ fontSize:12, color:colors.textSecondary,
                          marginBottom:20 }}>
              How fares vary month by month across the year ·
              Base = 100
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={MONTH_DATA}
                margin={{ top:10, right:10, left:-10, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3"
                               stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month"
                       tick={{ fontSize:11, fill:colors.textMuted }}
                       axisLine={false} tickLine={false} />
                <YAxis domain={[90,120]}
                       tick={{ fontSize:10, fill:colors.textMuted }}
                       axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v,n,p) => [v.toFixed(1), "APIx"]}
                  labelFormatter={(l,p) =>
                    `${l} — ${p?.[0]?.payload?.label ?? ""}`}
                  contentStyle={{ ...glass.strong, borderRadius:12,
                                  border:"none" }}
                />
                <Bar dataKey="index" radius={[6,6,0,0]}>
                  {MONTH_DATA.map((m,i) => (
                    <Cell key={i}
                      fill={m.index >= 108 ? colors.red
                          : m.index >= 100 ? colors.amber
                          : colors.green}
                      fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>

          {/* Month cards */}
          <div style={{ display:"grid",
                        gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",
                        gap:12 }}>
            {MONTH_DATA.map(m => (
              <GlassCard key={m.month} style={{ padding:16 }}>
                <div style={{ display:"flex", justifyContent:"space-between",
                              alignItems:"flex-start" }}>
                  <div style={{ fontSize:16, fontWeight:700,
                                color:colors.textPrimary }}>
                    {m.month}
                  </div>
                  <div style={{
                    fontSize:11, fontWeight:600, padding:"2px 8px",
                    borderRadius:99,
                    background: m.demand==="Very High"
                      ? "rgba(239,68,68,0.15)"
                      : m.demand==="High"
                      ? "rgba(245,158,11,0.15)"
                      : m.demand==="Medium"
                      ? "rgba(59,130,246,0.15)"
                      : "rgba(16,185,129,0.15)",
                    color: m.demand==="Very High" ? colors.red
                         : m.demand==="High"      ? colors.amber
                         : m.demand==="Medium"    ? colors.blue
                         : colors.green,
                  }}>
                    {m.demand}
                  </div>
                </div>
                <div style={{ fontSize:26, fontWeight:800,
                              color: m.index >= 108 ? colors.red
                                   : m.index >= 100 ? colors.amber
                                   : colors.green,
                              marginTop:8 }}>
                  {m.index}
                </div>
                <div style={{ fontSize:11, color:colors.textMuted,
                              marginTop:4 }}>
                  {m.label}
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* ── Festival Surges ───────────────────────────────────────────────── */}
      {activeTab === "festivals" && (
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
          <GlassCard>
            <div style={{ fontSize:16, fontWeight:700,
                          color:colors.textPrimary, marginBottom:6 }}>
              🎉 Festival Surge Detector
            </div>
            <div style={{ fontSize:12, color:colors.textSecondary,
                          marginBottom:20 }}>
              Average price surge % during major Indian festivals ·
              Book early to avoid peak prices
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={FESTIVALS} layout="vertical"
                margin={{ top:0, right:20, left:20, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3"
                               stroke="rgba(255,255,255,0.04)" />
                <XAxis type="number"
                       tick={{ fontSize:10, fill:colors.textMuted }}
                       axisLine={false} tickLine={false}
                       tickFormatter={v => `+${v}%`} />
                <YAxis type="category" dataKey="name" width={90}
                       tick={{ fontSize:11, fill:colors.textMuted }}
                       axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={v => [`+${v}%`, "Price surge"]}
                  contentStyle={{ ...glass.strong, borderRadius:12,
                                  border:"none" }}
                />
                <Bar dataKey="surge" radius={[0,6,6,0]}>
                  {FESTIVALS.map((f,i) => (
                    <Cell key={i}
                      fill={f.surge >= 35 ? colors.red
                          : f.surge >= 25 ? colors.amber
                          : colors.blue}
                      fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>

          {/* Festival cards */}
          <div style={{ display:"grid",
                        gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",
                        gap:16 }}>
            {FESTIVALS.sort((a,b) => b.surge-a.surge).map(f => (
              <GlassCard key={f.name} style={{
                borderLeft:`3px solid ${
                  f.surge>=35 ? colors.red
                  : f.surge>=25 ? colors.amber
                  : colors.blue}`,
              }}>
                <div style={{ display:"flex",
                              justifyContent:"space-between",
                              alignItems:"flex-start",
                              marginBottom:12 }}>
                  <div>
                    <div style={{ fontSize:16, fontWeight:700,
                                  color:colors.textPrimary }}>
                      {f.name}
                    </div>
                    <div style={{ fontSize:12, color:colors.textSecondary }}>
                      Around {f.date}
                    </div>
                  </div>
                  <div style={{
                    fontSize:22, fontWeight:800,
                    color: f.surge>=35 ? colors.red
                         : f.surge>=25 ? colors.amber
                         : colors.blue,
                  }}>
                    +{f.surge}%
                  </div>
                </div>
                <div style={{ fontSize:11, color:colors.textMuted,
                              marginBottom:8 }}>
                  Affected routes:
                </div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {f.routes.map(r => (
                    <span key={r} style={{
                      fontSize:11, fontWeight:600,
                      background:"rgba(255,255,255,0.06)",
                      border:`1px solid ${colors.border}`,
                      borderRadius:6, padding:"2px 8px",
                      color:colors.textSecondary,
                      fontFamily:"monospace",
                    }}>{r}</span>
                  ))}
                </div>
                <div style={{
                  marginTop:12, fontSize:11,
                  color: f.impact==="Very High" ? colors.red
                       : f.impact==="High"      ? colors.amber
                       : colors.blue,
                  fontWeight:600,
                }}>
                  {f.impact} impact
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* ── Savings Insights ──────────────────────────────────────────────── */}
      {activeTab === "savings" && (
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
          <SavingsCalculator />

                      {windowData.length > 0 && (
              <div style={{ marginBottom:16, padding:"12px 16px",
                            background:"rgba(59,130,246,0.08)",
                            border:"1px solid rgba(59,130,246,0.2)",
                            borderRadius:10, fontSize:12,
                            color:colors.textSecondary }}>
                📊 Live data: {windowData[0]?.count ?? 0} fares
                analysed across {windowData.length} advance windows
                from last 30 days of scraping
              </div>
            )} 

          <GlassCard>
            <div style={{ fontSize:16, fontWeight:700,
                          color:colors.textPrimary, marginBottom:6 }}>
              Advance Booking Savings Curve
            </div>
            <div style={{ fontSize:12, color:colors.textSecondary,
                          marginBottom:20 }}>
              Average savings % vs last-minute booking ·
              All routes combined
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={ADVANCE_SAVINGS}
                margin={{ top:10, right:10, left:-10, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3"
                               stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="window"
                       tick={{ fontSize:12, fill:colors.textMuted }}
                       axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:10, fill:colors.textMuted }}
                       tickFormatter={v => `${v}%`}
                       axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v,n,p) => [
                    `${v}% savings · ₹${p.payload.avgFare.toLocaleString("en-IN")} avg`,
                    p.payload.label
                  ]}
                  contentStyle={{ ...glass.strong, borderRadius:12,
                                  border:"none" }}
                />
                <Bar dataKey="saving" radius={[6,6,0,0]}>
                  {ADVANCE_SAVINGS.map((d,i) => (
                    <Cell key={i}
                      fill={d.saving>=32 ? colors.green
                          : d.saving>=18 ? colors.blue
                          : colors.amber}
                      fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Insight */}
            <div style={{
              marginTop:16, padding:"14px 18px",
              background:"rgba(16,185,129,0.08)",
              border:"1px solid rgba(16,185,129,0.2)",
              borderRadius:10, display:"flex",
              alignItems:"center", gap:12,
            }}>
              <span style={{ fontSize:24 }}>💡</span>
              <div>
                <div style={{ fontSize:13, fontWeight:600,
                              color:colors.green }}>
                  Sweet spot: Book 30 days ahead
                </div>
                <div style={{ fontSize:12,
                              color:colors.textSecondary }}>
                  T+30 offers the best savings (38%) without the risk
                  of unavailability. T+45 is slightly more expensive
                  than T+30 as airlines adjust prices upward for
                  very early bookers.
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* ── Route Correlation ─────────────────────────────────────────────── */}
      {activeTab === "correlation" && (
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
          <GlassCard>
            <div style={{ fontSize:16, fontWeight:700,
                          color:colors.textPrimary, marginBottom:6 }}>
              Cross-Route Price Correlation
            </div>
            <div style={{ fontSize:12, color:colors.textSecondary,
                          marginBottom:20 }}>
              How routes move together · Bubble size = price change magnitude ·
              Correlated routes move in the same direction
            </div>
            {loading ? <Skeleton h={300} radius={8} /> : (
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart
                  margin={{ top:10, right:20, left:-10, bottom:10 }}>
                  <CartesianGrid strokeDasharray="3 3"
                                 stroke="rgba(255,255,255,0.04)" />
                  <XAxis type="number" dataKey="x" name="Route 1 fare"
                         tick={{ fontSize:10, fill:colors.textMuted }}
                         axisLine={false} tickLine={false}
                         tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                  <YAxis type="number" dataKey="y" name="Route 2 fare"
                         tick={{ fontSize:10, fill:colors.textMuted }}
                         axisLine={false} tickLine={false}
                         tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                  <ZAxis type="number" dataKey="z" range={[60,400]} />
                  <Tooltip
                    cursor={{ strokeDasharray:"3 3" }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const d = payload[0]?.payload
                      return (
                        <div style={{ ...glass.strong, padding:"12px 16px",
                                      borderRadius:12 }}>
                          <div style={{ fontSize:13, fontWeight:700,
                                        color:colors.textPrimary }}>
                            {d.route1} ↔ {d.route2}
                          </div>
                          <div style={{ fontSize:12, color:colors.blue,
                                        marginTop:4 }}>
                            Correlation: {d.correlation}
                          </div>
                        </div>
                      )
                    }}
                  />
                  <Scatter data={correlation} fill={colors.blue}
                           fillOpacity={0.6} />
                </ScatterChart>
              </ResponsiveContainer>
            )}
          </GlassCard>

          {/* Correlation table */}
          <GlassCard>
            <div style={{ fontSize:15, fontWeight:700,
                          color:colors.textPrimary, marginBottom:16 }}>
              Route Pair Correlations
            </div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse",
                              fontSize:13 }}>
                <thead>
                  <tr>
                    {["Route 1","Route 2","Correlation",
                      "Interpretation"].map(h => (
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
                  {correlation
                    .sort((a,b) => b.correlation - a.correlation)
                    .slice(0,10)
                    .map((c,i) => (
                    <tr key={i} style={{
                      borderBottom:`1px solid ${colors.border}`,
                    }}>
                      <td style={{ padding:"12px 14px",
                                   fontFamily:"monospace",
                                   color:colors.blue,
                                   fontWeight:600 }}>
                        {c.route1}
                      </td>
                      <td style={{ padding:"12px 14px",
                                   fontFamily:"monospace",
                                   color:colors.cyan,
                                   fontWeight:600 }}>
                        {c.route2}
                      </td>
                      <td style={{ padding:"12px 14px" }}>
                        <div style={{ display:"flex",
                                      alignItems:"center", gap:10 }}>
                          <div style={{
                            height:6, borderRadius:3,
                            width:`${c.correlation*100}%`,
                            background: c.correlation>0.8
                              ? colors.green
                              : c.correlation>0.6
                              ? colors.blue : colors.amber,
                            maxWidth:100,
                          }} />
                          <span style={{ color:colors.textPrimary,
                                         fontWeight:600 }}>
                            {c.correlation}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding:"12px 14px",
                                   color:colors.textSecondary,
                                   fontSize:12 }}>
                        {c.correlation > 0.8
                          ? "Strong — move together"
                          : c.correlation > 0.6
                          ? "Moderate correlation"
                          : "Weak — independent"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  )
}