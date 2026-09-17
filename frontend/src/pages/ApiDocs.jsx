// src/pages/ApiDocs.jsx
import { useState } from "react"
import GlassCard from "../components/GlassCard"
import { colors, glass } from "../styles/theme"

const BASE_URL = "https://your-render-url.onrender.com"

const ENDPOINTS = [
  {
    method:"GET", path:"/",
    title:"Health check",
    desc:"Confirms API is running and returns version info.",
    params:[],
    response:`{
  "status": "ok",
  "service": "APIx — India Airfare Price Index",
  "version": "1.0.0",
  "timestamp": "2026-09-15T10:30:00",
  "database": "supabase"
}`,
  },
  {
    method:"GET", path:"/api/index/latest",
    title:"Latest APIx",
    desc:"Returns today's national APIx value with full route breakdown. Primary endpoint for NSO/RBI CPI integration.",
    params:[],
    response:`{
  "index_date": "2026-09-15",
  "apix_value": 108.4,
  "routes_used": 8,
  "computed_at": "2026-09-15T23:45:00",
  "base_period": "2026-09",
  "route_breakdown": [
    {
      "route": "DEL-BOM",
      "weight": 12.4,
      "base_fare": 3800,
      "today_fare": 4120,
      "route_index": 108.4,
      "change_pct": 8.4
    }
  ]
}`,
  },
  {
    method:"GET", path:"/api/index/history",
    title:"Index history",
    desc:"Returns daily APIx values for trend analysis.",
    params:[
      { name:"days", type:"integer", default:"30",
        desc:"Number of days of history (max 365)" },
    ],
    response:`{
  "days": 30,
  "count": 30,
  "history": [
    { "index_date": "2026-08-16", "apix_value": 98.2 },
    { "index_date": "2026-08-17", "apix_value": 99.1 }
  ],
  "latest": { "index_date": "2026-09-15", "apix_value": 108.4 }
}`,
  },
  {
    method:"GET", path:"/api/routes",
    title:"Route heatmap",
    desc:"All tracked routes with current avg fare and week-on-week change.",
    params:[],
    response:`{
  "count": 8,
  "updated_at": "2026-09-15T10:30:00",
  "routes": [
    {
      "route": "DEL-BOM",
      "name": "Delhi → Mumbai",
      "weight": 12.4,
      "avg_fare": 4120,
      "change_pct": 3.5,
      "trend": "up"
    }
  ]
}`,
  },
  {
    method:"GET", path:"/api/route/{origin}/{destination}",
    title:"Route detail",
    desc:"Full analysis for one route — lead-time curve, carrier breakdown, recent fares.",
    params:[
      { name:"origin",      type:"string", default:"DEL",
        desc:"IATA airport code of origin" },
      { name:"destination", type:"string", default:"BOM",
        desc:"IATA airport code of destination" },
    ],
    response:`{
  "route": "DEL-BOM",
  "name": "Delhi → Mumbai",
  "weight": 12.4,
  "lead_time_curve": [
    { "advance_days": 1,  "avg_fare": 5200, "min_fare": 4100, "max_fare": 7800 },
    { "advance_days": 7,  "avg_fare": 4120, "min_fare": 3400, "max_fare": 5600 },
    { "advance_days": 15, "avg_fare": 3890, "min_fare": 3100, "max_fare": 5200 }
  ],
  "carrier_summary": [
    { "carrier": "IndiGo", "avg_fare": 3820, "count": 42 }
  ],
  "recent_count": 165
}`,
  },
  {
    method:"GET", path:"/api/stats",
    title:"Database stats",
    desc:"Summary statistics about the database.",
    params:[],
    response:`{
  "status": "ok",
  "stats": {
    "total_fare_records": 8420,
    "latest_apix": 108.4,
    "latest_index_date": "2026-09-15"
  },
  "routes": [
    { "code": "DEL-BOM", "name": "Delhi → Mumbai", "weight": 12.4 }
  ]
}`,
  },
]

const METHOD_COLORS = {
  GET:  { bg:"rgba(16,185,129,0.12)", border:"rgba(16,185,129,0.3)",  text:colors.green  },
  POST: { bg:"rgba(59,130,246,0.12)", border:"rgba(59,130,246,0.3)",  text:colors.blue   },
}

function EndpointCard({ ep }) {
  const [open, setOpen] = useState(false)
  const mc = METHOD_COLORS[ep.method]

  return (
    <div style={{
      ...glass.card, borderRadius:14,
      overflow:"hidden",
      transition:"all 0.2s",
    }}>
      {/* Header */}
      <div
        onClick={() => setOpen(!open)}
        style={{
          padding:"16px 20px", cursor:"pointer",
          display:"flex", alignItems:"center",
          gap:14, transition:"background 0.12s",
        }}
        onMouseEnter={e =>
          e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
        onMouseLeave={e =>
          e.currentTarget.style.background = "transparent"}>
        <span style={{
          fontSize:11, fontWeight:700, padding:"4px 10px",
          borderRadius:6, background:mc.bg,
          border:`1px solid ${mc.border}`,
          color:mc.text, fontFamily:"monospace",
          flexShrink:0,
        }}>
          {ep.method}
        </span>
        <code style={{ fontSize:14, color:colors.textPrimary,
                       fontFamily:"monospace", flex:1 }}>
          {ep.path}
        </code>
        <span style={{ fontSize:13, color:colors.textSecondary,
                       flex:2, display:"none" }}
              className="hide-mobile">
          {ep.title}
        </span>
        <span style={{ color:colors.textMuted, fontSize:14,
                       transition:"transform 0.2s",
                       transform: open ? "rotate(180deg)" : "rotate(0)" }}>
          ▾
        </span>
      </div>

      {/* Expanded */}
      {open && (
        <div style={{ borderTop:`1px solid ${colors.border}`,
                      padding:"20px 24px" }}>
          <div style={{ fontSize:14, color:colors.textSecondary,
                        lineHeight:1.7, marginBottom:20 }}>
            {ep.desc}
          </div>

          {/* Full URL */}
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:11, color:colors.textMuted,
                          textTransform:"uppercase",
                          letterSpacing:"0.07em", marginBottom:8 }}>
              Full URL
            </div>
            <div style={{
              background:"rgba(255,255,255,0.04)",
              border:`1px solid ${colors.border}`,
              borderRadius:8, padding:"10px 14px",
              fontFamily:"monospace", fontSize:13,
              color:colors.blue, wordBreak:"break-all",
            }}>
              {BASE_URL}{ep.path}
            </div>
          </div>

          {/* Parameters */}
          {ep.params.length > 0 && (
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:11, color:colors.textMuted,
                            textTransform:"uppercase",
                            letterSpacing:"0.07em",
                            marginBottom:10 }}>
                Parameters
              </div>
              <table style={{ width:"100%",
                              borderCollapse:"collapse",
                              fontSize:13 }}>
                <thead>
                  <tr>
                    {["Name","Type","Default","Description"].map(h=>(
                      <th key={h} style={{
                        padding:"8px 12px", textAlign:"left",
                        fontSize:10, color:colors.textMuted,
                        textTransform:"uppercase",
                        letterSpacing:"0.06em",
                        borderBottom:`1px solid ${colors.border}`,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ep.params.map((p,i) => (
                    <tr key={i}>
                      <td style={{ padding:"10px 12px",
                                   fontFamily:"monospace",
                                   color:colors.cyan, fontWeight:600 }}>
                        {p.name}
                      </td>
                      <td style={{ padding:"10px 12px",
                                   color:colors.amber }}>
                        {p.type}
                      </td>
                      <td style={{ padding:"10px 12px",
                                   fontFamily:"monospace",
                                   color:colors.textMuted }}>
                        {p.default}
                      </td>
                      <td style={{ padding:"10px 12px",
                                   color:colors.textSecondary }}>
                        {p.desc}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Response */}
          <div>
            <div style={{ fontSize:11, color:colors.textMuted,
                          textTransform:"uppercase",
                          letterSpacing:"0.07em", marginBottom:8 }}>
              Example response
            </div>
            <div style={{ position:"relative" }}>
              <pre style={{
                background:"rgba(0,0,0,0.3)",
                border:`1px solid ${colors.border}`,
                borderRadius:10, padding:"16px 18px",
                fontSize:12, color:"#a8d8a8",
                fontFamily:"monospace", overflowX:"auto",
                lineHeight:1.6, margin:0,
              }}>
                {ep.response}
              </pre>
              <button
                onClick={() => navigator.clipboard.writeText(ep.response)}
                style={{
                  position:"absolute", top:10, right:10,
                  background:"rgba(255,255,255,0.08)",
                  border:`1px solid ${colors.border}`,
                  borderRadius:6, color:colors.textMuted,
                  padding:"4px 10px", cursor:"pointer",
                  fontSize:11,
                }}>
                Copy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ApiDocs() {
  const [copied, setCopied] = useState(false)

  function copyBase() {
    navigator.clipboard.writeText(BASE_URL)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ maxWidth:1100, margin:"0 auto",
                  padding:"40px 20px 80px" }}>

      {/* Header */}
      <div style={{ marginBottom:40 }}>
        <h1 style={{ fontSize:28, fontWeight:800,
                     color:colors.textPrimary,
                     letterSpacing:"-0.5px", marginBottom:8 }}>
          API Documentation
        </h1>
        <p style={{ fontSize:14, color:colors.textSecondary,
                    marginBottom:20 }}>
          REST API for NSO/RBI integration ·
          JSON responses · No authentication required (prototype)
        </p>

        {/* Base URL */}
        <div style={{
          ...glass.card, padding:"16px 20px",
          borderRadius:14, display:"flex",
          alignItems:"center", gap:14,
          flexWrap:"wrap",
        }}>
          <div style={{ fontSize:11, color:colors.textMuted,
                        textTransform:"uppercase",
                        letterSpacing:"0.07em", flexShrink:0 }}>
            Base URL
          </div>
          <code style={{ flex:1, fontSize:14, color:colors.blue,
                         fontFamily:"monospace" }}>
            {BASE_URL}
          </code>
          <button onClick={copyBase} style={{
            background: copied
              ? "rgba(16,185,129,0.15)"
              : "rgba(255,255,255,0.07)",
            border:`1px solid ${copied
              ? "rgba(16,185,129,0.3)"
              : colors.border}`,
            borderRadius:8, color: copied
              ? colors.green : colors.textSecondary,
            padding:"6px 14px", cursor:"pointer",
            fontSize:12, fontWeight:500,
            transition:"all 0.2s",
          }}>
            {copied ? "✓ Copied" : "Copy"}
          </button>
        </div>
      </div>

      {/* Quick info cards */}
      <div style={{ display:"grid",
                    gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",
                    gap:14, marginBottom:32 }}>
        {[
          { label:"Format",      value:"JSON",         icon:"{ }" },
          { label:"Auth",        value:"None (prototype)", icon:"🔓" },
          { label:"Rate limit",  value:"60 req/min",   icon:"⏱" },
          { label:"Update freq", value:"Daily 11:30 PM IST", icon:"🔄" },
          { label:"Endpoints",   value:ENDPOINTS.length, icon:"🔌" },
        ].map(item => (
          <GlassCard key={item.label} style={{ padding:"14px 16px" }}>
            <div style={{ fontSize:20, marginBottom:6 }}>{item.icon}</div>
            <div style={{ fontSize:11, color:colors.textMuted,
                          textTransform:"uppercase",
                          letterSpacing:"0.07em" }}>
              {item.label}
            </div>
            <div style={{ fontSize:15, fontWeight:700,
                          color:colors.textPrimary, marginTop:2 }}>
              {item.value}
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Integration guide */}
      <GlassCard style={{ marginBottom:28 }}>
        <div style={{ fontSize:15, fontWeight:700,
                      color:colors.textPrimary, marginBottom:16 }}>
          🔗 NSO/RBI Integration Guide
        </div>
        <div style={{ display:"grid",
                      gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",
                      gap:14 }}>
          {[
            { step:"1", title:"Daily index pull",
              code:`GET /api/index/latest\n# Call after midnight IST\n# Use apix_value for CPI input`,
              color:colors.blue },
            { step:"2", title:"Historical trend",
              code:`GET /api/index/history?days=90\n# 90-day trend for quarterly\n# Use history[] array`,
              color:colors.green },
            { step:"3", title:"Route breakdown",
              code:`GET /api/routes\n# Route-level data\n# Use for sub-group analysis`,
              color:colors.purple },
          ].map(item => (
            <div key={item.step} style={{
              background:"rgba(255,255,255,0.03)",
              border:`1px solid ${colors.border}`,
              borderRadius:12, padding:"16px 18px",
            }}>
              <div style={{ display:"flex", alignItems:"center",
                            gap:10, marginBottom:10 }}>
                <div style={{
                  width:28, height:28, borderRadius:8,
                  background:`rgba(${
                    item.color===colors.blue ? "59,130,246"
                    : item.color===colors.green ? "16,185,129"
                    : "139,92,246"},0.2)`,
                  display:"flex", alignItems:"center",
                  justifyContent:"center",
                  fontSize:13, fontWeight:800,
                  color:item.color,
                }}>
                  {item.step}
                </div>
                <div style={{ fontSize:13, fontWeight:600,
                              color:colors.textPrimary }}>
                  {item.title}
                </div>
              </div>
              <pre style={{
                background:"rgba(0,0,0,0.25)",
                borderRadius:8, padding:"10px 12px",
                fontSize:11, color:"#a8d8a8",
                fontFamily:"monospace", margin:0,
                lineHeight:1.7,
              }}>
                {item.code}
              </pre>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Endpoints */}
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:15, fontWeight:700,
                      color:colors.textPrimary, marginBottom:4 }}>
          Endpoints
        </div>
        <div style={{ fontSize:12, color:colors.textSecondary }}>
          Click any endpoint to expand it
        </div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {ENDPOINTS.map((ep, i) => (
          <EndpointCard key={i} ep={ep} />
        ))}
      </div>

      {/* Error codes */}
      <GlassCard style={{ marginTop:28 }}>
        <div style={{ fontSize:15, fontWeight:700,
                      color:colors.textPrimary, marginBottom:16 }}>
          Error Codes
        </div>
        <table style={{ width:"100%", borderCollapse:"collapse",
                        fontSize:13 }}>
          <thead>
            <tr>
              {["Code","Meaning","Action"].map(h=>(
                <th key={h} style={{
                  padding:"8px 14px", textAlign:"left",
                  fontSize:11, color:colors.textMuted,
                  textTransform:"uppercase",
                  letterSpacing:"0.07em",
                  borderBottom:`1px solid ${colors.border}`,
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { code:"200", meaning:"Success",
                action:"Use the response data normally",
                color:colors.green },
              { code:"404", meaning:"No data found",
                action:"Run scraper first — database may be empty",
                color:colors.amber },
              { code:"500", meaning:"Server error",
                action:"Check Render logs — server may be cold starting",
                color:colors.red },
              { code:"503", meaning:"Service unavailable",
                action:"Render free tier sleeping — retry after 30 seconds",
                color:colors.red },
            ].map((row,i) => (
              <tr key={i} style={{
                borderBottom:`1px solid ${colors.border}`,
              }}>
                <td style={{ padding:"12px 14px" }}>
                  <span style={{
                    fontFamily:"monospace", fontWeight:700,
                    fontSize:14, color:row.color,
                  }}>{row.code}</span>
                </td>
                <td style={{ padding:"12px 14px",
                             color:colors.textPrimary,
                             fontWeight:500 }}>
                  {row.meaning}
                </td>
                <td style={{ padding:"12px 14px",
                             color:colors.textSecondary }}>
                  {row.action}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlassCard>
    </div>
  )
}