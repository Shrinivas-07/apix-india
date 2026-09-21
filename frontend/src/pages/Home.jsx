// src/pages/Home.jsx
import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
  Area, AreaChart, ComposedChart, Bar
} from "recharts"
import useLiveData      from "../hooks/useLiveData"
import AnimatedNumber   from "../components/AnimatedNumber"
import GlassCard    from "../components/GlassCard"
import StatCard     from "../components/StatCard"
import LiveBadge    from "../components/LiveBadge"
import FlightRow    from "../components/FlightRow"
import BookingPanel from "../components/BookingPanel"
import Skeleton     from "../components/Skeleton"
import {
  fetchLatestIndex, fetchIndexHistory,
  fetchRoutes, fetchStats, fetchLiveFeed
} from "../api"
const BACKEND_URL = "https://apix-india-api.onrender.com"
import { colors, glass, gradients, text, spacing, radius } from "../styles/theme"

     

// ── Airport data for search ───────────────────────────────────────────────────
const AIRPORTS = [
  { code:"DEL", name:"Indira Gandhi Intl", city:"Delhi" },
  { code:"BOM", name:"Chhatrapati Shivaji Intl", city:"Mumbai" },
  { code:"BLR", name:"Kempegowda Intl", city:"Bengaluru" },
  { code:"CCU", name:"Netaji Subhas Chandra Bose Intl", city:"Kolkata" },
  { code:"MAA", name:"Chennai Intl", city:"Chennai" },
  { code:"HYD", name:"Rajiv Gandhi Intl", city:"Hyderabad" },
  { code:"GOI", name:"Goa Intl", city:"Goa" },
  { code:"AMD", name:"Sardar Vallabhbhai Patel Intl", city:"Ahmedabad" },
  { code:"PNQ", name:"Pune Intl", city:"Pune" },
  { code:"JAI", name:"Jaipur Intl", city:"Jaipur" },
  { code:"COK", name:"Cochin Intl", city:"Kochi" },
  { code:"ATQ", name:"Sri Guru Ram Dass Jee Intl", city:"Amritsar" },
  { code:"LKO", name:"Chaudhary Charan Singh Intl", city:"Lucknow" },
  { code:"BBI", name:"Biju Patnaik Intl", city:"Bhubaneswar" },
  { code:"GAU", name:"Lokpriya Gopinath Bordoloi Intl", city:"Guwahati" },
]

// ── Mock flight data per route ────────────────────────────────────────────────
function getMockFlights(origin, destination, date) {
  const base = {
    "DEL-BOM": [
      { carrier:"IndiGo",    flight_number:"6E-2123", departure_time:"06:00", arrival_time:"08:10", duration:"2h 10m", total_fare:3840, base_fare:3149, taxes:691 },
      { carrier:"Air India", flight_number:"AI-401",  departure_time:"08:30", arrival_time:"10:45", duration:"2h 15m", total_fare:4120, base_fare:3378, taxes:742 },
      { carrier:"Akasa",     flight_number:"QP-1301", departure_time:"11:00", arrival_time:"13:15", duration:"2h 15m", total_fare:3920, base_fare:3214, taxes:706 },
      { carrier:"SpiceJet",  flight_number:"SG-101",  departure_time:"14:30", arrival_time:"16:40", duration:"2h 10m", total_fare:4280, base_fare:3510, taxes:770 },
    ],
    "DEL-BLR": [
      { carrier:"IndiGo",    flight_number:"6E-2505", departure_time:"07:00", arrival_time:"09:40", duration:"2h 40m", total_fare:3200, base_fare:2624, taxes:576 },
      { carrier:"Air India", flight_number:"AI-502",  departure_time:"10:00", arrival_time:"12:45", duration:"2h 45m", total_fare:3840, base_fare:3149, taxes:691 },
      { carrier:"Akasa",     flight_number:"QP-201",  departure_time:"13:30", arrival_time:"16:15", duration:"2h 45m", total_fare:3100, base_fare:2542, taxes:558 },
      { carrier:"SpiceJet",  flight_number:"SG-201",  departure_time:"17:00", arrival_time:"19:45", duration:"2h 45m", total_fare:3450, base_fare:2829, taxes:621 },
    ],
    "BOM-BLR": [
      { carrier:"IndiGo",    flight_number:"6E-841",  departure_time:"06:30", arrival_time:"08:00", duration:"1h 30m", total_fare:2840, base_fare:2329, taxes:511 },
      { carrier:"Air India", flight_number:"AI-617",  departure_time:"09:00", arrival_time:"10:35", duration:"1h 35m", total_fare:3120, base_fare:2558, taxes:562 },
      { carrier:"Akasa",     flight_number:"QP-401",  departure_time:"12:00", arrival_time:"13:40", duration:"1h 40m", total_fare:2920, base_fare:2394, taxes:526 },
      { carrier:"SpiceJet",  flight_number:"SG-304",  departure_time:"16:00", arrival_time:"17:35", duration:"1h 35m", total_fare:3080, base_fare:2526, taxes:554 },
    ],
    "DEL-CCU": [
      { carrier:"IndiGo",    flight_number:"6E-701",  departure_time:"07:30", arrival_time:"09:55", duration:"2h 25m", total_fare:4920, base_fare:4034, taxes:886 },
      { carrier:"Air India", flight_number:"AI-401",  departure_time:"10:30", arrival_time:"13:00", duration:"2h 30m", total_fare:5320, base_fare:4362, taxes:958 },
      { carrier:"SpiceJet",  flight_number:"SG-701",  departure_time:"14:00", arrival_time:"16:25", duration:"2h 25m", total_fare:4780, base_fare:3920, taxes:860 },
      { carrier:"Akasa",     flight_number:"QP-701",  departure_time:"18:00", arrival_time:"20:30", duration:"2h 30m", total_fare:5100, base_fare:4182, taxes:918 },
    ],
  }
  const key     = `${origin}-${destination}`
  const flights = base[key] || base["DEL-BOM"]
  return flights.map(f => ({ ...f, origin, destination, travel_date: date }))
}

// ── Custom chart tooltip ──────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const val   = payload[0]?.value
  const prev  = payload[1]?.value
  const delta = val && prev ? (val - prev).toFixed(1) : null
  return (
    <div style={{
      ...glass.strong, padding: "12px 16px",
      borderRadius: 12, minWidth: 160,
    }}>
      <div style={{ fontSize: 11, color: colors.textMuted,
                    marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700,
                    color: colors.textPrimary }}>
        APIx {val?.toFixed(2)}
      </div>
      {delta && (
        <div style={{
          fontSize: 12, marginTop: 4,
          color: delta > 0 ? colors.green : colors.red,
          fontWeight: 500,
        }}>
          {delta > 0 ? "▲" : "▼"} {Math.abs(delta)} vs prev month
        </div>
      )}
    </div>
  )
}

// ── Live feed item ────────────────────────────────────────────────────────────
function LiveFeedItem({ item }) {
  const up = item.change > 0
  return (
    <div style={{
      display: "flex", alignItems: "center",
      justifyContent: "space-between",
      padding: "10px 0",
      borderBottom: `1px solid ${colors.border}`,
      animation: "fade-up 0.4s ease",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 8, height: 8, borderRadius: "50%",
          background: up ? colors.green : colors.red,
          boxShadow: `0 0 6px ${up ? colors.green : colors.red}`,
          flexShrink: 0,
        }} />
        <div>
          <span style={{ fontSize: 13, fontWeight: 600,
                         color: colors.textPrimary }}>
            {item.route}
          </span>
          <span style={{ fontSize: 12, color: colors.textSecondary,
                         marginLeft: 8 }}>
            {item.carrier}
          </span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ fontSize: 12, color: colors.textSecondary }}>
          ₹{item.from?.toLocaleString("en-IN")} →{" "}
          <span style={{ color: colors.textPrimary, fontWeight: 600 }}>
            ₹{item.to?.toLocaleString("en-IN")}
          </span>
        </div>
        <div style={{
          fontSize: 12, fontWeight: 600,
          color: up ? colors.green : colors.red,
          minWidth: 60, textAlign: "right",
        }}>
          {up ? "▲" : "▼"} {Math.abs(item.change)}%
        </div>
        <div style={{ fontSize: 11, color: colors.textMuted,
                      minWidth: 70, textAlign: "right" }}>
          {item.time}
        </div>
      </div>
    </div>
  )
}

// ── Airport search dropdown ───────────────────────────────────────────────────
function AirportSelect({ value, onChange, placeholder, exclude }) {
  const [open,   setOpen]   = useState(false)
  const [query,  setQuery]  = useState("")
  const selected = AIRPORTS.find(a => a.code === value)
  const filtered = AIRPORTS.filter(a =>
    a.code !== exclude &&
    (a.code.toLowerCase().includes(query.toLowerCase()) ||
     a.city.toLowerCase().includes(query.toLowerCase()) ||
     a.name.toLowerCase().includes(query.toLowerCase()))
  )

  return (
    <div style={{ position: "relative", flex: 1 }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          ...glass.card, padding: "14px 18px",
          cursor: "pointer", display: "flex",
          alignItems: "center", justifyContent: "space-between",
          borderRadius: 12,
          border: open
            ? `1px solid ${colors.blue}`
            : `1px solid ${colors.glassBorder}`,
        }}>
        {selected ? (
          <div>
            <div style={{ fontSize: 18, fontWeight: 800,
                          color: colors.textPrimary }}>
              {selected.code}
            </div>
            <div style={{ fontSize: 11, color: colors.textSecondary }}>
              {selected.city}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 14, color: colors.textMuted }}>
            {placeholder}
          </div>
        )}
        <span style={{ color: colors.textMuted, fontSize: 12 }}>
          {open ? "▲" : "▼"}
        </span>
      </div>

      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0,
          zIndex: 500, marginTop: 8,
          ...glass.strong, borderRadius: 14,
          padding: 8, maxHeight: 280, overflowY: "auto",
        }}>
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search city or code..."
            style={{
              width: "100%", background: "rgba(255,255,255,0.06)",
              border: `1px solid ${colors.border}`,
              borderRadius: 8, padding: "8px 12px",
              color: colors.textPrimary, fontSize: 13,
              outline: "none", marginBottom: 6,
            }} />
          {filtered.map(a => (
            <div key={a.code}
              onClick={() => { onChange(a.code); setOpen(false); setQuery("") }}
              style={{
                padding: "10px 12px", borderRadius: 8,
                cursor: "pointer", transition: "background 0.12s",
                display: "flex", alignItems: "center",
                justifyContent: "space-between",
              }}
              onMouseEnter={e =>
                e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
              onMouseLeave={e =>
                e.currentTarget.style.background = "transparent"}>
              <div>
                <span style={{ fontSize: 14, fontWeight: 700,
                               color: colors.textPrimary }}>{a.code}</span>
                <span style={{ fontSize: 12, color: colors.textSecondary,
                               marginLeft: 8 }}>{a.city}</span>
              </div>
              <div style={{ fontSize: 11, color: colors.textMuted }}>
                {a.name.slice(0, 20)}...
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function LiveStatusCard() {
  const [status, setStatus] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${BACKEND_URL}/api/live/status`)
        const data = await res.json()
        setStatus(data)
      } catch {
        // ignore transient status fetch failures
      }
    }

    load()
    const timer = setInterval(load, 5 * 60 * 1000)
    return () => clearInterval(timer)
  }, [])

  if (!status) return null

  const isLive = status.status === "fresh"
  const color = isLive ? colors.green : colors.amber
  const bgColor = isLive ? "rgba(16,185,129,0.08)" : "rgba(245,158,11,0.08)"
  const bdColor = isLive ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)"

  return (
    <div style={{
      background: bgColor, border: `1px solid ${bdColor}`,
      borderRadius: 12, padding: "14px 20px",
      display: "flex", alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap", gap: 12, marginBottom: 24,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color }}>
            {isLive ? "Data is fresh" : "Data may be stale"}
          </div>
          <div style={{ fontSize: 11, color: colors.textSecondary }}>
            Last scrape: {status.minutes_ago ?? "—"} min ago ·
            Route: {status.last_route ?? "—"}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        {[
          { label: "Scraper", value: status.live_scraper_enabled ? "Running" : "Scheduled" },
          { label: "Interval", value: `${status.interval_minutes} min` },
          { label: "Status", value: status.status },
        ].map(item => (
          <div key={item.label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, color: colors.textMuted,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em" }}>
              {item.label}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600,
                          color: colors.textPrimary, marginTop: 2 }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main Home component ───────────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate()
  const { data: liveWs } = useLiveData()

    // ── Live WebSocket data ───────────────────────────────────────────────────
  const { connected: wsConnected,
          lastUpdate: wsLastUpdate } = useLiveData()

  // Data states
  const [loading,  setLoading]  = useState(true)
  const [latest,   setLatest]   = useState(null)
  const [history,  setHistory]  = useState([])
  const [routes,   setRoutes]   = useState([])
  const [stats,    setStats]    = useState(null)

  // UI states
  const [activeRoute,   setActiveRoute]   = useState("DEL-BOM")
  const [bookingFlight, setBookingFlight] = useState(null)
  const [travelDate,    setTravelDate]    = useState(
    new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  )

  // Search states
  const [searchFrom, setSearchFrom] = useState("DEL")
  const [searchTo,   setSearchTo]   = useState("BOM")

  // Live feed
  const [feed, setFeed] = useState([])

  // ── Load data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const [l, h, r, s] = await Promise.all([
          fetchLatestIndex(),
          fetchIndexHistory(60),
          fetchRoutes(),
          fetchStats(),
        ])
        setLatest(l)
        setHistory(h.history || [])
        setRoutes(r.routes  || [])
        setStats(s.stats    || {})
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

    // Merge WebSocket feed with REST feed
  useEffect(() => {
    if (!liveWs?.recent_fares?.length) return

    const wsFeed = liveWs.recent_fares.slice(0, 6).map((r, i) => {
      const prev   = liveWs.recent_fares[i+1]?.base_fare ?? r.base_fare
      const change = prev
        ? +((r.base_fare - prev) / prev * 100).toFixed(1) : 0
      const mins   = Math.round(
        (Date.now() - new Date(r.scraped_at)) / 60000
      )
      return {
        route:   `${r.origin}-${r.destination}`,
        carrier: r.carrier ?? "—",
        from:    prev,
        to:      r.base_fare,
        change,
        time:    mins < 1 ? "just now"
               : mins < 60 ? `${mins} min ago`
               : `${Math.floor(mins/60)}h ago`,
      }
    })

    if (wsFeed.length > 0) setFeed(wsFeed)
  }, [liveWs])

  // ── Generate live feed ────────────────────────────────────────────────────
  useEffect(() => {
    const items = [
      { route:"DEL-BOM", carrier:"IndiGo",    from:3840, to:3920, change:2.1,  time:"2 min ago" },
      { route:"BLR-HYD", carrier:"Akasa",     from:2840, to:2790, change:-1.8, time:"5 min ago" },
      { route:"DEL-BLR", carrier:"Air India", from:3920, to:4010, change:2.3,  time:"8 min ago" },
      { route:"BOM-BLR", carrier:"SpiceJet",  from:3080, to:3150, change:2.3,  time:"11 min ago" },
      { route:"DEL-CCU", carrier:"IndiGo",    from:4920, to:4870, change:-1.0, time:"13 min ago" },
      { route:"MAA-DEL", carrier:"Air India", from:5310, to:5480, change:3.2,  time:"15 min ago" },
    ]
    setFeed(items)

    // Refresh feed every 15 minutes
    const timer = setInterval(() => {
      setFeed(prev => prev.map(item => ({
        ...item,
        from: item.to,
        to: Math.round(item.to * (1 + (Math.random() - 0.5) * 0.04)),
        change: +((Math.random() - 0.5) * 6).toFixed(1),
        time: "just now",
      })))
    }, 15 * 60 * 1000)
    return () => clearInterval(timer)
  }, [])

  // ── Derived values ────────────────────────────────────────────────────────
  const apix       = latest?.apix_value ?? 100
  const liveApix   = liveWs?.apix ?? apix
  const apixDelta  = +(apix - 100).toFixed(1)
  const isUp       = apixDelta > 0

  // Compare with last month
  const lastMonth  = history.length > 30 ? history[history.length - 31] : null
  const thisMonth  = history.length > 0  ? history[history.length - 1]  : null
  const monthDelta = lastMonth && thisMonth
    ? +((thisMonth.apix_value - lastMonth.apix_value) / lastMonth.apix_value * 100).toFixed(1)
    : null

  // Days up/down
  const daysUp   = history.filter((h, i) =>
    i > 0 && h.apix_value > history[i-1].apix_value).length
  const daysDown = history.filter((h, i) =>
    i > 0 && h.apix_value < history[i-1].apix_value).length

  // Cheapest / priciest route
  const sortedRoutes  = [...routes].sort((a, b) => a.avg_fare - b.avg_fare)
  const cheapest      = sortedRoutes[0]
  const priciest      = sortedRoutes[sortedRoutes.length - 1]

  // Chart data with last month overlay
  const chartData = history.slice(-30).map((h, i) => ({
    date:      h.index_date?.slice(5) ?? "",
    apix:      h.apix_value,
    lastMonth: history[Math.max(0, history.length - 60 + i)]?.apix_value ?? null,
  }))

  // Active route flights
  const [fromCode, toCode] = activeRoute.split("-")
  const flights = getMockFlights(fromCode, toCode, travelDate)

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto",
                  padding: "40px 20px 80px" }}>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "center",
                    marginBottom: 16, gap: 10,
                    alignItems: "center", flexWrap: "wrap" }}>
        <LiveBadge label="AUTO · Target refresh every 15 min" />
        {wsConnected && (
          <div style={{
            fontSize: 11, color: colors.green,
            display: "flex", alignItems: "center", gap: 4,
            background: "rgba(16,185,129,0.08)",
            border: "1px solid rgba(16,185,129,0.2)",
            padding: "3px 10px", borderRadius: 99,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: colors.green,
              display: "inline-block",
              animation: "pulse-dot 1.5s infinite",
            }} />
            WebSocket connected
          </div>
        )}
        {wsLastUpdate && (
          <div style={{ fontSize: 11, color: colors.textMuted }}>
            Updated {wsLastUpdate.toLocaleTimeString("en-IN")}
          </div>
        )}
      </div>

      <h1 style={{
        fontSize: "clamp(32px, 6vw, 64px)",
        fontWeight: 900, letterSpacing: "-2px",
        lineHeight: 1.05, marginBottom: 16,
        background: "linear-gradient(135deg, #f0f4ff 30%, #60a5fa 70%, #a78bfa)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
      }}>
        India's Real-time<br />Airfare Price Index
      </h1>

      <p style={{
        fontSize: 16, color: colors.textSecondary,
        maxWidth: 520, margin: "0 auto",
        lineHeight: 1.7,
      }}>
        Automated daily tracking of domestic airfares across major
        Indian routes. Built for MoSPI · NSO · RBI.
      </p>

      {/* ── KPI Cards ────────────────────────────────────────────────────── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 16, marginBottom: 32,
      }}>
                <StatCard
          label="National APIx"
          icon="📊"
          value={loading ? "—" : (
            <AnimatedNumber
              value={liveApix ?? 100}
              decimals={1}
              style={{ fontSize:32, fontWeight:800,
                       letterSpacing:"-1px" }}
            />
          )}
          
          sub={loading ? null
            : `${isUp ? "▲" : "▼"} ${Math.abs(apixDelta)} pts vs base period`}
          subUp={isUp}
          accentColor={isUp ? colors.red : colors.green}
          glow={isUp ? colors.redGlow : colors.greenGlow}
          loading={loading}
        />
        <StatCard
          label="vs Last Month"
          icon="📅"
          value={loading ? "—"
            : monthDelta !== null ? `${monthDelta > 0 ? "+" : ""}${monthDelta}%`
            : "—"}
          sub={loading ? null : "30-day price movement"}
          subUp={monthDelta !== null ? monthDelta > 0 : undefined}
          accentColor={colors.blue}
          glow={colors.blueGlow}
          loading={loading}
        />
        <StatCard
          label="Cheapest Corridor"
          icon="🟢"
          value={loading ? "—" : cheapest?.route ?? "—"}
          sub={loading ? null
            : `Avg ₹${cheapest?.avg_fare?.toLocaleString("en-IN") ?? "—"}`}
          subUp={false}
          accentColor={colors.green}
          glow={colors.greenGlow}
          loading={loading}
        />
        <StatCard
          label="Priciest Corridor"
          icon="🔴"
          value={loading ? "—" : priciest?.route ?? "—"}
          sub={loading ? null
            : `Avg ₹${priciest?.avg_fare?.toLocaleString("en-IN") ?? "—"}`}
          subUp={true}
          accentColor={colors.red}
          glow={colors.redGlow}
          loading={loading}
        />
        <StatCard
          label="Days Index Rose"
          icon="📈"
          value={loading ? "—" : `${daysUp}d`}
          sub="in last 30 days"
          accentColor={colors.red}
          loading={loading}
        />
        <StatCard
          label="Days Index Fell"
          icon="📉"
          value={loading ? "—" : `${daysDown}d`}
          sub="in last 30 days"
          accentColor={colors.green}
          loading={loading}
        />
      </div>

      {/* ── Search Bar ───────────────────────────────────────────────────── */}
      <GlassCard style={{ marginBottom: 32, padding: 24 }}>
        <div style={{ fontSize: 13, color: colors.textSecondary,
                      marginBottom: 14, fontWeight: 500 }}>
          🔍 Search flights
        </div>
        <div style={{ display: "flex", gap: 12,
                      alignItems: "flex-end", flexWrap: "wrap" }}>
          <AirportSelect
            value={searchFrom}
            onChange={setSearchFrom}
            placeholder="From"
            exclude={searchTo}
          />

          {/* Swap button */}
          <button
            onClick={() => {
              const tmp = searchFrom
              setSearchFrom(searchTo)
              setSearchTo(tmp)
            }}
            style={{
              background: glass.card.background,
              border: `1px solid ${colors.glassBorder}`,
              borderRadius: 10, color: colors.textPrimary,
              width: 44, height: 44, cursor: "pointer",
              fontSize: 18, flexShrink: 0,
              display: "flex", alignItems: "center",
              justifyContent: "center",
            }}>
            ⇄
          </button>

          <AirportSelect
            value={searchTo}
            onChange={setSearchTo}
            placeholder="To"
            exclude={searchFrom}
          />

          {/* Date */}
          <input
            type="date"
            value={travelDate}
            min={new Date().toISOString().slice(0, 10)}
            onChange={e => setTravelDate(e.target.value)}
            style={{
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${colors.glassBorder}`,
              borderRadius: 12, padding: "14px 18px",
              color: colors.textPrimary, fontSize: 14,
              outline: "none", cursor: "pointer",
              minWidth: 160,
            }} />

          {/* Search button */}
          <button
            onClick={() => navigate(`/search?from=${searchFrom}&to=${searchTo}&date=${travelDate}`)}
            style={{
              background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
              border: "none", borderRadius: 12,
              color: "#fff", padding: "14px 28px",
              fontSize: 14, fontWeight: 700,
              cursor: "pointer", whiteSpace: "nowrap",
              boxShadow: "0 4px 20px rgba(59,130,246,0.4)",
              transition: "all 0.15s",
              letterSpacing: "0.02em",
            }}
            onMouseEnter={e => e.target.style.transform = "scale(1.03)"}
            onMouseLeave={e => e.target.style.transform = "scale(1)"}>
            Search Flights →
          </button>
        </div>
      </GlassCard>

      {/* ── Charts Row ───────────────────────────────────────────────────── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1.6fr 1fr",
        gap: 20, marginBottom: 24,
      }}>

        {/* Price index trend */}
        <GlassCard>
          <div style={{ display: "flex", justifyContent: "space-between",
                        alignItems: "flex-start", marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700,
                            color: colors.textPrimary }}>
                APIx — 30 Day Trend
              </div>
              <div style={{ fontSize: 12, color: colors.textSecondary,
                            marginTop: 4 }}>
                vs same period last month
              </div>
            </div>
            <div style={{
              fontSize: 11, color: colors.textMuted,
              display: "flex", gap: 16
            }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 20, height: 2, background: colors.blue,
                               display: "inline-block", borderRadius: 1 }} />
                This month
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 20, height: 2,
                               background: colors.textMuted,
                               display: "inline-block", borderRadius: 1,
                               borderTop: "1px dashed" }} />
                Last month
              </span>
            </div>
          </div>

          {loading ? <Skeleton h={260} radius={8} /> : (
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={chartData}
                margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="apixGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3"
                               stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: colors.textMuted }}
                       axisLine={false} tickLine={false} />
                <YAxis domain={["auto","auto"]}
                       tick={{ fontSize: 10, fill: colors.textMuted }}
                       axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <ReferenceLine y={100} stroke={colors.textMuted}
                               strokeDasharray="4 4" />
                <Area type="monotone" dataKey="apix"
                      stroke={colors.blue} strokeWidth={2.5}
                      fill="url(#apixGrad)" dot={false} name="This month" />
                <Line type="monotone" dataKey="lastMonth"
                      stroke={colors.textMuted} strokeWidth={1}
                      strokeDasharray="4 4" dot={false}
                      name="Last month" />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </GlassCard>

        {/* Route heatmap */}
        <GlassCard>
          <div style={{ fontSize: 16, fontWeight: 700,
                        color: colors.textPrimary, marginBottom: 16 }}>
            Route Heatmap
          </div>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[...Array(6)].map((_,i) => <Skeleton key={i} h={48} radius={8} />)}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {routes.slice(0, 8).map(r => {
                const up  = r.change_pct > 0
                const bg  = up
                  ? `rgba(239,68,68,${Math.min(0.08 + Math.abs(r.change_pct) * 0.01, 0.2)})`
                  : `rgba(16,185,129,${Math.min(0.08 + Math.abs(r.change_pct) * 0.01, 0.2)})`
                const bd  = up
                  ? `rgba(239,68,68,0.2)` : `rgba(16,185,129,0.2)`
                return (
                  <div
                    key={r.route}
                    onClick={() => navigate(`/route/${r.route}`)}
                    style={{
                      background: bg, border: `1px solid ${bd}`,
                      borderRadius: 10, padding: "10px 14px",
                      display: "flex", alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer", transition: "all 0.15s",
                    }}
                    onMouseEnter={e =>
                      e.currentTarget.style.transform = "translateX(4px)"}
                    onMouseLeave={e =>
                      e.currentTarget.style.transform = "translateX(0)"}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700,
                                    color: colors.textPrimary }}>
                        {r.route}
                      </div>
                      <div style={{ fontSize: 11, color: colors.textSecondary }}>
                        ₹{r.avg_fare?.toLocaleString("en-IN")}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{
                        fontSize: 13, fontWeight: 600,
                        color: up ? "#ef4444" : "#10b981"
                      }}>
                        {up ? "▲" : "▼"} {Math.abs(r.change_pct)}%
                      </div>
                      <div style={{ fontSize: 10, color: colors.textMuted }}>
                        vs last week
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </GlassCard>
      </div>

      {/* ── Cheapest Flights Section ──────────────────────────────────────── */}
      <GlassCard style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between",
                      alignItems: "center", marginBottom: 20,
                      flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700,
                          color: colors.textPrimary }}>
              ✈ Cheapest Flights Today
            </div>
            <div style={{ fontSize: 12, color: colors.textSecondary,
                          marginTop: 4 }}>
              Live fares · Click Book Now to reserve on airline website
            </div>
          </div>

          {/* Date picker */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, color: colors.textSecondary }}>
              Travel date:
            </span>
            <input
              type="date"
              value={travelDate}
              min={new Date().toISOString().slice(0, 10)}
              onChange={e => setTravelDate(e.target.value)}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: `1px solid ${colors.border}`,
                borderRadius: 8, padding: "6px 12px",
                color: colors.textPrimary, fontSize: 13,
                outline: "none", cursor: "pointer",
              }} />
          </div>
        </div>

        {/* Route tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20,
                      flexWrap: "wrap" }}>
          {["DEL-BOM","DEL-BLR","BOM-BLR","DEL-CCU"].map(route => (
            <button key={route}
              onClick={() => setActiveRoute(route)}
              style={{
                padding: "8px 16px", borderRadius: 20,
                border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 600,
                background: activeRoute === route
                  ? "linear-gradient(135deg, #3b82f6, #1d4ed8)"
                  : "rgba(255,255,255,0.05)",
                color: activeRoute === route
                  ? "#fff" : colors.textSecondary,
                boxShadow: activeRoute === route
                  ? "0 4px 16px rgba(59,130,246,0.3)" : "none",
                transition: "all 0.15s",
              }}>
              {route}
            </button>
          ))}
        </div>

        {/* Flight rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {flights.map((f, i) => (
            <FlightRow key={i} flight={f}
              onBook={flight => setBookingFlight(flight)} />
          ))}
        </div>
      </GlassCard>

      {/* ── Index Stats Row ───────────────────────────────────────────────── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: 16, marginBottom: 24,
      }}>
        <GlassCard>
          <div style={{ fontSize: 13, fontWeight: 600,
                        color: colors.textSecondary, marginBottom: 16 }}>
            📅 This Month's Index Movement
          </div>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            {[
              { label:"Days up",    value:`${daysUp}d`,   color: colors.red },
              { label:"Days down",  value:`${daysDown}d`, color: colors.green },
              { label:"Net change", value: monthDelta !== null
                ? `${monthDelta > 0 ? "+" : ""}${monthDelta}%` : "—",
                color: monthDelta > 0 ? colors.red : colors.green },
            ].map(item => (
              <div key={item.label}>
                <div style={{ fontSize: 11, color: colors.textMuted,
                              textTransform: "uppercase",
                              letterSpacing: "0.07em" }}>
                  {item.label}
                </div>
                <div style={{ fontSize: 26, fontWeight: 800,
                              color: item.color, marginTop: 4 }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <div style={{ fontSize: 13, fontWeight: 600,
                        color: colors.textSecondary, marginBottom: 16 }}>
            📊 Index Range (30 days)
          </div>
          {history.length > 0 && (() => {
            const vals    = history.slice(-30).map(h => h.apix_value)
            const highest = Math.max(...vals)
            const lowest  = Math.min(...vals)
            const hDate   = history.slice(-30)[vals.indexOf(highest)]?.index_date
            const lDate   = history.slice(-30)[vals.indexOf(lowest)]?.index_date
            return (
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                {[
                  { label:"Highest", value: highest.toFixed(1),
                    sub: hDate, color: colors.red },
                  { label:"Lowest",  value: lowest.toFixed(1),
                    sub: lDate, color: colors.green },
                  { label:"Average",
                    value: (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1),
                    sub: "30d avg", color: colors.blue },
                ].map(item => (
                  <div key={item.label}>
                    <div style={{ fontSize: 11, color: colors.textMuted,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.07em" }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: 26, fontWeight: 800,
                                  color: item.color, marginTop: 4 }}>
                      {item.value}
                    </div>
                    <div style={{ fontSize: 11, color: colors.textMuted }}>
                      {item.sub}
                    </div>
                  </div>
                ))}
              </div>
            )
          })()}
        </GlassCard>

        <GlassCard>
          <div style={{ fontSize: 13, fontWeight: 600,
                        color: colors.textSecondary, marginBottom: 16 }}>
            💾 Database Stats
          </div>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            {[
              { label:"Fare records",
                value: stats?.total_fare_records?.toLocaleString() ?? "—",
                color: colors.blue },
              { label:"Routes",
                value: "8",
                color: colors.purple },
              { label:"Windows",
                value: "5",
                color: colors.cyan },
            ].map(item => (
              <div key={item.label}>
                <div style={{ fontSize: 11, color: colors.textMuted,
                              textTransform: "uppercase",
                              letterSpacing: "0.07em" }}>
                  {item.label}
                </div>
                <div style={{ fontSize: 26, fontWeight: 800,
                              color: item.color, marginTop: 4 }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* ── Live Feed ─────────────────────────────────────────────────────── */}
      <LiveStatusCard />

      <GlassCard>
        <div style={{ display: "flex", justifyContent: "space-between",
                      alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700,
                        color: colors.textPrimary }}>
            Live Price Movement Feed
          </div>
          <LiveBadge label="15 min delay" />
        </div>
        <div>
          {feed.map((item, i) => (
            <LiveFeedItem key={i} item={item} />
          ))}
        </div>
        <div style={{ fontSize: 11, color: colors.textMuted,
                      marginTop: 14, textAlign: "center" }}>
          Showing last 15 minutes of price movements across tracked routes
        </div>
      </GlassCard>

      {/* ── Booking Panel ─────────────────────────────────────────────────── */}
      {bookingFlight && (
        <BookingPanel
          flight={bookingFlight}
          onClose={() => setBookingFlight(null)}
        />
      )}
    </div>
  )
}
