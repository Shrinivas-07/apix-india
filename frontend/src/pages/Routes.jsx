// src/pages/Routes.jsx
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import GlassCard from "../components/GlassCard"
import LiveBadge from "../components/LiveBadge"
import Skeleton  from "../components/Skeleton"
import { fetchRoutes, fetchStats } from "../api"
import { colors, glass } from "../styles/theme"

// ── All routes including extras beyond our 8 tracked ones ────────────────────
const ALL_ROUTES = [
  // Tracked (have real data)
  { route:"DEL-BOM", name:"Delhi → Mumbai",        weight:12.4, region:"North-West",  tracked:true  },
  { route:"DEL-BLR", name:"Delhi → Bengaluru",     weight:8.6,  region:"North-South", tracked:true  },
  { route:"BOM-BLR", name:"Mumbai → Bengaluru",    weight:6.2,  region:"West-South",  tracked:true  },
  { route:"DEL-CCU", name:"Delhi → Kolkata",       weight:5.6,  region:"North-East",  tracked:true  },
  { route:"MAA-DEL", name:"Chennai → Delhi",       weight:5.2,  region:"South-North", tracked:true  },
  { route:"BLR-HYD", name:"Bengaluru → Hyderabad", weight:3.7,  region:"South",       tracked:true  },
  { route:"BOM-HYD", name:"Mumbai → Hyderabad",    weight:3.3,  region:"West-South",  tracked:true  },
  { route:"CCU-BOM", name:"Kolkata → Mumbai",      weight:2.7,  region:"East-West",   tracked:true  },
  // Additional routes (proxy data)
  { route:"DEL-GOI", name:"Delhi → Goa",           weight:2.1,  region:"North-West",  tracked:false },
  { route:"BOM-GOI", name:"Mumbai → Goa",          weight:1.9,  region:"West",        tracked:false },
  { route:"DEL-HYD", name:"Delhi → Hyderabad",     weight:2.4,  region:"North-South", tracked:false },
  { route:"BOM-CCU", name:"Mumbai → Kolkata",      weight:1.8,  region:"West-East",   tracked:false },
  { route:"MAA-BOM", name:"Chennai → Mumbai",      weight:2.2,  region:"South-West",  tracked:false },
  { route:"DEL-AMD", name:"Delhi → Ahmedabad",     weight:1.6,  region:"North-West",  tracked:false },
  { route:"BLR-MAA", name:"Bengaluru → Chennai",   weight:1.4,  region:"South",       tracked:false },
  { route:"DEL-COK", name:"Delhi → Kochi",         weight:1.3,  region:"North-South", tracked:false },
  { route:"BOM-AMD", name:"Mumbai → Ahmedabad",    weight:1.2,  region:"West",        tracked:false },
  { route:"DEL-PNQ", name:"Delhi → Pune",          weight:1.1,  region:"North-West",  tracked:false },
  { route:"BLR-DEL", name:"Bengaluru → Delhi",     weight:0.9,  region:"South-North", tracked:false },
  { route:"HYD-BOM", name:"Hyderabad → Mumbai",    weight:0.8,  region:"South-West",  tracked:false },
]

const REGIONS = ["All","North-West","North-South","West-South",
                 "North-East","South-North","South","East-West",
                 "West-East","South-West","West"]

const SORT_OPTIONS = [
  { label:"Weight ↓",  key:"weight",     dir:-1 },
  { label:"Fare ↓",    key:"avg_fare",   dir:-1 },
  { label:"Fare ↑",    key:"avg_fare",   dir:1  },
  { label:"Change ↓",  key:"change_pct", dir:-1 },
  { label:"Change ↑",  key:"change_pct", dir:1  },
  { label:"Route A-Z", key:"route",      dir:1  },
]

// ── Route card ────────────────────────────────────────────────────────────────
function RouteCard({ route, liveData, onClick }) {
  const live   = liveData?.find(r => r.route === route.route)
  const up     = live ? live.change_pct > 0 : false
  const change = live?.change_pct ?? 0
  const fare   = live?.avg_fare

  // Color intensity based on change magnitude
  const intensity = Math.min(Math.abs(change) / 20, 1)
  const glowColor = up
    ? `rgba(239,68,68,${intensity * 0.3})`
    : `rgba(16,185,129,${intensity * 0.3})`

  return (
    <div
      onClick={onClick}
      className="glass-card"
      style={{
        ...glass.card,
        padding: 20,
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
        boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${colors.glassBorder}`,
        transition: "all 0.2s",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = "translateY(-4px)"
        e.currentTarget.style.boxShadow =
          `0 16px 48px rgba(0,0,0,0.5), 0 0 20px ${glowColor}`
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "translateY(0)"
        e.currentTarget.style.boxShadow =
          `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${colors.glassBorder}`
      }}>

      {/* Background glow */}
      <div style={{
        position: "absolute", top: 0, right: 0,
        width: 80, height: 80, borderRadius: "50%",
        background: glowColor,
        filter: "blur(30px)", pointerEvents: "none",
      }} />

      {/* Tracked badge */}
      {route.tracked && (
        <div style={{
          position: "absolute", top: 12, right: 12,
          fontSize: 10, fontWeight: 600,
          background: "rgba(59,130,246,0.15)",
          border: "1px solid rgba(59,130,246,0.3)",
          color: colors.blue, padding: "2px 8px",
          borderRadius: 99,
        }}>LIVE</div>
      )}

      {/* Route code */}
      <div style={{
        fontSize: 22, fontWeight: 900, color: colors.textPrimary,
        letterSpacing: "-0.5px", marginBottom: 4,
        fontFamily: "monospace",
      }}>
        {route.route.replace("-", " → ")}
      </div>

      {/* Name */}
      <div style={{ fontSize: 12, color: colors.textSecondary,
                    marginBottom: 16, lineHeight: 1.4 }}>
        {route.name}
      </div>

      {/* Fare */}
      <div style={{ marginBottom: 12 }}>
        {fare ? (
          <div style={{ fontSize: 26, fontWeight: 800,
                        color: colors.textPrimary,
                        letterSpacing: "-1px" }}>
            ₹{fare.toLocaleString("en-IN")}
          </div>
        ) : (
          <div style={{ fontSize: 14, color: colors.textMuted }}>
            Proxy data
          </div>
        )}
        <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
          avg base fare · T+7
        </div>
      </div>

      {/* Change */}
      {live && (
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div style={{
            fontSize: 14, fontWeight: 700,
            color: up ? colors.red : colors.green,
            display: "flex", alignItems: "center", gap: 4,
          }}>
            {up ? "▲" : "▼"} {Math.abs(change)}%
            <span style={{ fontSize: 11, fontWeight: 400,
                           color: colors.textMuted }}>
              vs last week
            </span>
          </div>
          <div style={{
            fontSize: 11, color: colors.textMuted,
            background: "rgba(255,255,255,0.04)",
            padding: "3px 8px", borderRadius: 6,
          }}>
            {route.weight}% weight
          </div>
        </div>
      )}

      {/* Weight bar */}
      <div style={{
        marginTop: 14, height: 3,
        background: "rgba(255,255,255,0.06)",
        borderRadius: 2, overflow: "hidden",
      }}>
        <div style={{
          height: "100%",
          width: `${Math.min(route.weight * 6, 100)}%`,
          background: up
            ? "linear-gradient(90deg, #dc2626, #ef4444)"
            : "linear-gradient(90deg, #059669, #10b981)",
          borderRadius: 2,
          transition: "width 0.6s ease",
        }} />
      </div>

      {/* Arrow */}
      <div style={{
        position: "absolute", bottom: 16, right: 16,
        fontSize: 18, color: colors.textMuted,
        transition: "transform 0.15s, color 0.15s",
      }}>→</div>

      <div style={{ marginTop: 10, paddingTop: 10,
                    borderTop: `1px solid ${colors.border}`,
                    display: "flex", gap: 8 }}>
        <button
          onClick={e => {
            e.stopPropagation()
            window.location.href = `/compare?a=${route.route}`
          }}
          style={{
            fontSize: 11, padding: "4px 10px",
            borderRadius: 6, border: `1px solid ${colors.border}`,
            background: "transparent",
            color: colors.textMuted, cursor: "pointer",
          }}>
          ⚖ Compare
        </button>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function RoutesPage() {
  const navigate  = useNavigate()
  const [loading,  setLoading]  = useState(true)
  const [liveData, setLiveData] = useState([])
  const [search,   setSearch]   = useState("")
  const [region,   setRegion]   = useState("All")
  const [sortIdx,  setSortIdx]  = useState(0)
  const [showTrackedOnly, setShowTrackedOnly] = useState(false)

  useEffect(() => {
    fetchRoutes()
      .then(r => setLiveData(r.routes || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // ── Filter + Sort ─────────────────────────────────────────────────────────
  const sort = SORT_OPTIONS[sortIdx]

  const filtered = ALL_ROUTES
    .filter(r => {
      if (showTrackedOnly && !r.tracked) return false
      if (region !== "All" && r.region !== region) return false
      if (search) {
        const q = search.toLowerCase()
        return r.route.toLowerCase().includes(q) ||
               r.name.toLowerCase().includes(q)
      }
      return true
    })
    .sort((a, b) => {
      const liveA = liveData.find(r => r.route === a.route)
      const liveB = liveData.find(r => r.route === b.route)
      let vA = a[sort.key] ?? liveA?.[sort.key] ?? 0
      let vB = b[sort.key] ?? liveB?.[sort.key] ?? 0
      if (sort.key === "route") return vA.localeCompare(vB) * sort.dir
      return (vA - vB) * sort.dir
    })

  // ── Summary stats ─────────────────────────────────────────────────────────
  const tracked  = liveData.filter(r => r.avg_fare)
  const avgFare  = tracked.length
    ? Math.round(tracked.reduce((s, r) => s + r.avg_fare, 0) / tracked.length)
    : 0
  const risers   = liveData.filter(r => r.change_pct > 0).length
  const fallers  = liveData.filter(r => r.change_pct < 0).length
  const cheapest = [...liveData].sort((a,b) => a.avg_fare - b.avg_fare)[0]
  const priciest = [...liveData].sort((a,b) => b.avg_fare - a.avg_fare)[0]

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto",
                  padding: "40px 20px 80px" }}>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center",
                      gap: 12, marginBottom: 8 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800,
                       color: colors.textPrimary,
                       letterSpacing: "-0.5px" }}>
            All Routes
          </h1>
          <LiveBadge />
        </div>
        <p style={{ fontSize: 14, color: colors.textSecondary }}>
          {ALL_ROUTES.length} domestic corridors ·{" "}
          {ALL_ROUTES.filter(r => r.tracked).length} tracked live ·{" "}
          {ALL_ROUTES.filter(r => !r.tracked).length} proxy data
        </p>
      </div>

      {/* ── Summary cards ────────────────────────────────────────────────── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))",
        gap: 14, marginBottom: 28,
      }}>
        {[
          { label:"Avg fare",    value:`₹${avgFare.toLocaleString("en-IN")}`,
            color: colors.blue,   icon:"💰" },
          { label:"Routes rising", value:`${risers}`,
            color: colors.red,    icon:"📈" },
          { label:"Routes falling", value:`${fallers}`,
            color: colors.green,  icon:"📉" },
          { label:"Cheapest today", value: cheapest?.route ?? "—",
            color: colors.green,  icon:"🟢",
            sub: cheapest ? `₹${cheapest.avg_fare?.toLocaleString("en-IN")}` : "" },
          { label:"Priciest today", value: priciest?.route ?? "—",
            color: colors.red,    icon:"🔴",
            sub: priciest ? `₹${priciest.avg_fare?.toLocaleString("en-IN")}` : "" },
        ].map(item => (
          <GlassCard key={item.label}
            style={{ borderTop: `2px solid ${item.color}` }}>
            <div style={{ fontSize: 11, color: colors.textMuted,
                          textTransform: "uppercase",
                          letterSpacing: "0.07em", marginBottom: 6 }}>
              {item.icon} {item.label}
            </div>
            {loading
              ? <Skeleton h={32} radius={4} />
              : <div style={{ fontSize: 24, fontWeight: 800,
                              color: colors.textPrimary }}>{item.value}</div>
            }
            {item.sub && !loading && (
              <div style={{ fontSize: 12, color: colors.textSecondary,
                            marginTop: 4 }}>{item.sub}</div>
            )}
          </GlassCard>
        ))}
      </div>

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <GlassCard style={{ marginBottom: 24, padding: "18px 20px" }}>
        <div style={{ display: "flex", gap: 12,
                      alignItems: "center", flexWrap: "wrap" }}>

          {/* Search */}
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <span style={{ position: "absolute", left: 12, top: "50%",
                           transform: "translateY(-50%)",
                           color: colors.textMuted, fontSize: 14 }}>🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search route or city..."
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.05)",
                border: `1px solid ${colors.border}`,
                borderRadius: 10, padding: "10px 14px 10px 36px",
                color: colors.textPrimary, fontSize: 13,
                outline: "none",
              }} />
          </div>

          {/* Region filter */}
          <select
            value={region}
            onChange={e => setRegion(e.target.value)}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: `1px solid ${colors.border}`,
              borderRadius: 10, padding: "10px 14px",
              color: colors.textPrimary, fontSize: 13,
              outline: "none", cursor: "pointer",
            }}>
            {REGIONS.map(r => (
              <option key={r} value={r}
                style={{ background: "#0d1528" }}>{r}</option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortIdx}
            onChange={e => setSortIdx(+e.target.value)}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: `1px solid ${colors.border}`,
              borderRadius: 10, padding: "10px 14px",
              color: colors.textPrimary, fontSize: 13,
              outline: "none", cursor: "pointer",
            }}>
            {SORT_OPTIONS.map((o, i) => (
              <option key={i} value={i}
                style={{ background: "#0d1528" }}>{o.label}</option>
            ))}
          </select>

          {/* Tracked only toggle */}
          <button
            onClick={() => setShowTrackedOnly(!showTrackedOnly)}
            style={{
              padding: "10px 16px", borderRadius: 10, border: "none",
              cursor: "pointer", fontSize: 12, fontWeight: 600,
              background: showTrackedOnly
                ? "linear-gradient(135deg, #3b82f6, #1d4ed8)"
                : "rgba(255,255,255,0.05)",
              color: showTrackedOnly ? "#fff" : colors.textSecondary,
              boxShadow: showTrackedOnly
                ? "0 4px 12px rgba(59,130,246,0.3)" : "none",
              transition: "all 0.15s", whiteSpace: "nowrap",
            }}>
            {showTrackedOnly ? "✓ Live only" : "Show all"}
          </button>

          {/* Count */}
          <div style={{ fontSize: 12, color: colors.textMuted,
                        whiteSpace: "nowrap" }}>
            {filtered.length} routes
          </div>
        </div>
      </GlassCard>

      {/* ── Route grid ───────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 16
        }}>
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} h={200} radius={16} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <GlassCard style={{ textAlign: "center", padding: 60 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✈</div>
          <div style={{ fontSize: 16, color: colors.textSecondary }}>
            No routes match your filters
          </div>
          <button
            onClick={() => {
              setSearch("")
              setRegion("All")
              setShowTrackedOnly(false)
            }}
            style={{
              marginTop: 16, padding: "10px 24px",
              borderRadius: 10, border: "none",
              background: "rgba(59,130,246,0.15)",
              color: colors.blue, cursor: "pointer",
              fontSize: 13, fontWeight: 600,
            }}>
            Clear filters
          </button>
        </GlassCard>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 16,
        }}>
          {filtered.map(route => (
            <RouteCard
              key={route.route}
              route={route}
              liveData={liveData}
              onClick={() => navigate(`/route/${route.route}`)}
            />
          ))}
                {/* Compare link */}
      <div style={{ marginTop:10, paddingTop:10,
                    borderTop:`1px solid ${colors.border}`,
                    display:"flex", gap:8 }}>
        <button
          onClick={e => {
            e.stopPropagation()
            window.location.href = `/compare?a=${route.route}`
          }}
          style={{
            fontSize:11, padding:"4px 10px",
            borderRadius:6, border:`1px solid ${colors.border}`,
            background:"transparent",
            color:colors.textMuted, cursor:"pointer",
          }}>
          ⚖ Compare
        </button>
      </div>
        </div>
      )}
      {/* ── Footer note ──────────────────────────────────────────────────── */}
      <div style={{
        marginTop: 40, textAlign: "center",
        fontSize: 12, color: colors.textMuted, lineHeight: 1.8,
      }}>
        <div>LIVE routes have real scraped data updated nightly.</div>
        <div>Proxy routes use regional correlation estimates.</div>
        <div>Click any route card to see full analysis →</div>
      </div>
    </div>
  )
}