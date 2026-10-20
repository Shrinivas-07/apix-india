// src/pages/Search.jsx
import { useState, useEffect, useRef } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, ReferenceLine
} from "recharts"
import GlassCard    from "../components/GlassCard"
import BookingPanel from "../components/BookingPanel"
import Skeleton     from "../components/Skeleton"
import { fetchSearchFares } from "../api"
import { colors, glass } from "../styles/theme"

// ── Airport data ──────────────────────────────────────────────────────────────
const AIRPORTS = [
  { code:"DEL", name:"Indira Gandhi International", city:"Delhi",       state:"Delhi"         },
  { code:"BOM", name:"Chhatrapati Shivaji International", city:"Mumbai", state:"Maharashtra"  },
  { code:"BLR", name:"Kempegowda International",    city:"Bengaluru",  state:"Karnataka"     },
  { code:"CCU", name:"Netaji Subhas Chandra Bose",  city:"Kolkata",    state:"West Bengal"   },
  { code:"MAA", name:"Chennai International",        city:"Chennai",    state:"Tamil Nadu"    },
  { code:"HYD", name:"Rajiv Gandhi International",  city:"Hyderabad",  state:"Telangana"     },
  { code:"GOI", name:"Goa International (Dabolim)", city:"Goa",        state:"Goa"           },
  { code:"AMD", name:"Sardar Vallabhbhai Patel",    city:"Ahmedabad",  state:"Gujarat"       },
  { code:"PNQ", name:"Pune International",           city:"Pune",       state:"Maharashtra"   },
  { code:"JAI", name:"Jaipur International",         city:"Jaipur",     state:"Rajasthan"     },
  { code:"COK", name:"Cochin International",         city:"Kochi",      state:"Kerala"        },
  { code:"ATQ", name:"Sri Guru Ram Dass Jee Intl",  city:"Amritsar",   state:"Punjab"        },
  { code:"LKO", name:"Chaudhary Charan Singh Intl", city:"Lucknow",    state:"Uttar Pradesh" },
  { code:"BBI", name:"Biju Patnaik International",  city:"Bhubaneswar",state:"Odisha"        },
  { code:"GAU", name:"Lokpriya Gopinath Bordoloi",  city:"Guwahati",   state:"Assam"         },
  { code:"IXC", name:"Chandigarh International",    city:"Chandigarh", state:"Chandigarh"    },
  { code:"VNS", name:"Lal Bahadur Shastri Intl",   city:"Varanasi",   state:"Uttar Pradesh" },
  { code:"PAT", name:"Jay Prakash Narayan Intl",    city:"Patna",      state:"Bihar"         },
  { code:"IXR", name:"Birsa Munda Airport",         city:"Ranchi",     state:"Jharkhand"     },
  { code:"SXR", name:"Sheikh ul-Alam International",city:"Srinagar",   state:"J&K"           },
]

// ── Mock search results ───────────────────────────────────────────────────────
function generateResults(from, to, date, passengers) {
  const baseFares = {
    "DEL-BOM":3800,"DEL-BLR":3200,"BOM-BLR":2800,"DEL-CCU":4800,
    "MAA-DEL":4900,"BLR-HYD":2200,"BOM-HYD":2900,"CCU-BOM":3900,
  }
  const key    = `${from}-${to}`
  const revKey = `${to}-${from}`
  const base   = baseFares[key] ?? baseFares[revKey] ?? 3500

  const advance = Math.max(1,
    Math.round((new Date(date) - new Date()) / 86400000))
  const advFactor = advance <= 1  ? 1.45
                  : advance <= 7  ? 1.20
                  : advance <= 15 ? 1.00
                  : advance <= 30 ? 0.92
                  : 0.94

  const carriers = [
    { carrier:"IndiGo",    code:"6E", factor:0.93, ontime:87, stops:0 },
    { carrier:"Air India", code:"AI", factor:1.07, ontime:79, stops:0 },
    { carrier:"Akasa",     code:"QP", factor:0.96, ontime:91, stops:0 },
    { carrier:"SpiceJet",  code:"SG", factor:1.02, ontime:72, stops:0 },
    { carrier:"Air India Express", code:"IX", factor:0.88, ontime:83, stops:0 },
  ]

  const times = [
    { dep:"05:30", arr_offset:130 },
    { dep:"07:00", arr_offset:140 },
    { dep:"09:30", arr_offset:125 },
    { dep:"12:00", arr_offset:135 },
    { dep:"15:30", arr_offset:130 },
    { dep:"18:00", arr_offset:140 },
    { dep:"20:30", arr_offset:130 },
  ]

  return carriers.flatMap((c, ci) =>
    times.slice(0, ci === 0 ? 7 : ci === 1 ? 5 : 4)
      .map((t, ti) => {
        const noise    = 0.93 + Math.random() * 0.14
        const baseFare = Math.round(base * advFactor * c.factor * noise)
        const taxes    = Math.round(baseFare * 0.18)
        const total    = (baseFare + taxes) * passengers

        const depH = parseInt(t.dep.split(":")[0])
        const depM = parseInt(t.dep.split(":")[1])
        const arrMin = depH * 60 + depM + t.arr_offset
        const arrH = Math.floor(arrMin / 60) % 24
        const arrM = arrMin % 60

        return {
          id:             `${c.code}-${100 + ti * 101}`,
          carrier:        c.carrier,
          flight_number:  `${c.code}-${100 + ti * 101}`,
          origin:         from,
          destination:    to,
          travel_date:    date,
          departure_time: t.dep,
          arrival_time:   `${String(arrH).padStart(2,"0")}:${String(arrM).padStart(2,"0")}`,
          duration:       `${Math.floor(t.arr_offset/60)}h ${t.arr_offset%60}m`,
          base_fare:      baseFare,
          taxes,
          total_fare:     Math.round(baseFare + taxes),
          total_price:    total,
          passengers,
          stops:          c.stops,
          ontime:         c.ontime,
          fare_class:     "Economy",
        }
      })
  ).sort((a, b) => a.total_fare - b.total_fare)
}

function generatePriceHistory(from, to, date) {
  const days   = []
  const base   = 3800
  const target = new Date(date)
  for (let i = 45; i >= 0; i--) {
    const d       = new Date(target)
    d.setDate(d.getDate() - (45 - i))
    const factor  = i <= 1 ? 1.4 : i <= 7 ? 1.2 : i <= 15 ? 1.0 : 0.92
    const noise   = 0.93 + Math.random() * 0.14
    days.push({
      label:   `T-${45-i}`,
      fare:    Math.round(base * factor * noise),
      advance: i,
    })
  }
  return days
}

// ── Airport search input ──────────────────────────────────────────────────────
function AirportInput({ value, onChange, placeholder, exclude }) {
  const [query,  setQuery]  = useState("")
  const [open,   setOpen]   = useState(false)
  const [focused, setFocused] = useState(false)
  const ref = useRef(null)

  const selected = AIRPORTS.find(a => a.code === value)
  const filtered = AIRPORTS.filter(a =>
    a.code !== exclude &&
    (a.code.toLowerCase().includes(query.toLowerCase()) ||
     a.city.toLowerCase().includes(query.toLowerCase()) ||
     a.name.toLowerCase().includes(query.toLowerCase()) ||
     a.state.toLowerCase().includes(query.toLowerCase()))
  ).slice(0, 8)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
        setFocused(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  return (
    <div ref={ref} style={{
      position:"relative",
      flex:"1 1 240px",
      minWidth:0,
      zIndex: open ? 20 : 1,
    }}>
      <div
        onClick={() => {
          const nextOpen = !open
          setOpen(nextOpen)
          setFocused(nextOpen)
        }}
        style={{
          ...glass.card, padding:"14px 52px 14px 18px",
          cursor:"pointer", borderRadius:14, position:"relative",
          background: colors.bgTertiary,
          backdropFilter: "none",
          WebkitBackdropFilter: "none",
          boxShadow: "0 8px 24px rgba(0,0,0,0.28)",
          border: focused
            ? `1px solid ${colors.blue}`
            : `1px solid ${colors.borderStrong}`,
          transition:"border-color 0.2s",
        }}>
        <div style={{ fontSize: 10, color: colors.textMuted,
                      textTransform: "uppercase",
                      letterSpacing: "0.07em", marginBottom: 4 }}>
          {placeholder}
        </div>
        {selected ? (
          <div>
            <div style={{ fontSize: 22, fontWeight: 800,
                          color: colors.textPrimary,
                          letterSpacing: "-0.5px" }}>
              {selected.code}
            </div>
            <div style={{ fontSize: 12, color: colors.textSecondary }}>
              {selected.city} · {selected.name}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 16, color: colors.textMuted }}>
            Select airport
          </div>
        )}
        <span style={{
          position: "absolute", right: 18, top: "50%",
          transform: "translateY(-50%)",
          color: focused ? colors.blue : colors.textSecondary,
          fontSize: 12, fontWeight: 700,
        }}>
          {open ? "▲" : "▼"}
        </span>
      </div>

      {open && (
        <div style={{
          position:"absolute", top:"calc(100% + 8px)",
          left:0, right:0, zIndex:9999,
          ...glass.strong, borderRadius:14, padding:8,
          background: colors.bgSecondary,
          backdropFilter: "none",
          WebkitBackdropFilter: "none",
          border: `1px solid ${colors.borderStrong}`,
          maxHeight:300, overflowY:"auto",
          boxShadow:"0 20px 60px rgba(0,0,0,0.5)",
        }}>
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search city, airport or code..."
            style={{
              width:"100%", marginBottom:6,
              background:colors.bg,
              border:`1px solid ${colors.border}`,
              borderRadius:8, padding:"8px 12px",
              color:colors.textPrimary, fontSize:13,
              outline:"none",
            }} />
          {filtered.length === 0 ? (
            <div style={{ padding:"12px", color:colors.textMuted,
                          fontSize:13, textAlign:"center" }}>
              No airports found
            </div>
          ) : filtered.map(a => (
            <div
              key={a.code}
              onMouseDown={e => {
                e.preventDefault()
                onChange(a.code)
                setOpen(false)
                setFocused(false)
                setQuery("")
              }}
              onClick={() => {
                onChange(a.code)
                setOpen(false)
                setFocused(false)
                setQuery("")
              }}
              style={{
                padding:"12px 14px", borderRadius:10,
                cursor:"pointer", transition:"background 0.1s",
                display:"flex", alignItems:"center",
                justifyContent:"space-between",
              }}
              onMouseEnter={e =>
                e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
              onMouseLeave={e =>
                e.currentTarget.style.background = "transparent"}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{
                  width:40, height:40, borderRadius:10,
                  background:"rgba(59,130,246,0.12)",
                  border:"1px solid rgba(59,130,246,0.2)",
                  display:"flex", alignItems:"center",
                  justifyContent:"center",
                  fontSize:13, fontWeight:800, color:colors.blue,
                  fontFamily:"monospace",
                }}>
                  {a.code}
                </div>
                <div>
                  <div style={{ fontSize:14, fontWeight:600,
                                color:colors.textPrimary }}>
                    {a.city}
                  </div>
                  <div style={{ fontSize:11, color:colors.textSecondary }}>
                    {a.name}
                  </div>
                </div>
              </div>
              <div style={{ fontSize:11, color:colors.textMuted }}>
                {a.state}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Flight result card ────────────────────────────────────────────────────────
function FlightCard({ flight, onBook, cheapest }) {
  const isCheap = flight.total_fare === cheapest
  return (
    <div
      className="glass-card"
      style={{
        ...glass.card, padding:"18px 20px",
        borderRadius:14, display:"flex",
        alignItems:"center", gap:16,
        flexWrap:"wrap",
        border: isCheap
          ? "1px solid rgba(16,185,129,0.35)"
          : `1px solid ${colors.glassBorder}`,
        position:"relative", overflow:"hidden",
      }}>

      {isCheap && (
        <div style={{
          position:"absolute", top:0, left:0,
          background:"linear-gradient(135deg, #059669, #10b981)",
          color:"#fff", fontSize:10, fontWeight:700,
          padding:"4px 14px 4px 10px",
          borderRadius:"14px 0 14px 0",
        }}>BEST PRICE</div>
      )}

      {/* Carrier */}
      <div style={{ minWidth:120, paddingTop: isCheap ? 8 : 0 }}>
        <div style={{ fontSize:15, fontWeight:700,
                      color:colors.textPrimary }}>
          {flight.carrier}
        </div>
        <div style={{ fontSize:12, color:colors.textSecondary }}>
          {flight.flight_number}
        </div>
        <div style={{ fontSize:11, color:colors.textMuted, marginTop:4 }}>
          {flight.ontime}% on-time
        </div>
      </div>

      {/* Times */}
      <div style={{ display:"flex", alignItems:"center",
                    gap:16, flex:1 }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:22, fontWeight:800,
                        color:colors.textPrimary,
                        letterSpacing:"-0.5px" }}>
            {flight.departure_time}
          </div>
          <div style={{ fontSize:12, color:colors.textSecondary }}>
            {flight.origin}
          </div>
        </div>

        <div style={{ flex:1, textAlign:"center" }}>
          <div style={{ fontSize:12, color:colors.textMuted }}>
            {flight.duration}
          </div>
          <div style={{
            margin:"6px 0",
            display:"flex", alignItems:"center",
            gap:4,
          }}>
            <div style={{ flex:1, height:1,
                          background:colors.border }} />
            <div style={{ fontSize:10, color:colors.textMuted }}>✈</div>
            <div style={{ flex:1, height:1,
                          background:colors.border }} />
          </div>
          <div style={{ fontSize:11,
                        color: flight.stops === 0
                          ? colors.green : colors.amber }}>
            {flight.stops === 0 ? "Non-stop" : `${flight.stops} stop`}
          </div>
        </div>

        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:22, fontWeight:800,
                        color:colors.textPrimary,
                        letterSpacing:"-0.5px" }}>
            {flight.arrival_time}
          </div>
          <div style={{ fontSize:12, color:colors.textSecondary }}>
            {flight.destination}
          </div>
        </div>
      </div>

      {/* Fare */}
      <div style={{ textAlign:"right", minWidth:120 }}>
        <div style={{ fontSize:24, fontWeight:800,
                      color: isCheap ? "#10b981" : colors.textPrimary,
                      letterSpacing:"-0.5px" }}>
          ₹{flight.total_fare.toLocaleString("en-IN")}
        </div>
        <div style={{ fontSize:11, color:colors.textSecondary }}>
          per person
        </div>
        {flight.passengers > 1 && (
          <div style={{ fontSize:11, color:colors.blue }}>
            ₹{flight.total_price.toLocaleString("en-IN")} total
          </div>
        )}
      </div>

      {/* Book button */}
      <button
        onClick={() => onBook(flight)}
        style={{
          background: isCheap
            ? "linear-gradient(135deg, #059669, #10b981)"
            : "linear-gradient(135deg, #3b82f6, #1d4ed8)",
          border:"none", borderRadius:10,
          color:"#fff", padding:"12px 22px",
          fontSize:13, fontWeight:700,
          cursor:"pointer", whiteSpace:"nowrap",
          boxShadow: isCheap
            ? "0 4px 16px rgba(16,185,129,0.35)"
            : "0 4px 16px rgba(59,130,246,0.35)",
          transition:"all 0.15s",
        }}
        onMouseEnter={e => e.target.style.opacity = "0.9"}
        onMouseLeave={e => e.target.style.opacity = "1"}>
        Book Now →
      </button>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Search() {
  const [searchParams] = useSearchParams()
  const navigate       = useNavigate()

  // Form state
  const [from,       setFrom]       = useState(searchParams.get("from") ?? "DEL")
  const [to,         setTo]         = useState(searchParams.get("to")   ?? "BOM")
  const [date,       setDate]       = useState(
    searchParams.get("date") ??
    new Date(Date.now() + 86400000).toISOString().slice(0,10)
  )
  const [passengers, setPassengers] = useState(1)
  const [cabinClass, setCabinClass] = useState("Economy")

  // Results state
  const [results,    setResults]    = useState([])
  const [history,    setHistory]    = useState([])
  const [searching,  setSearching]  = useState(false)
  const [searched,   setSearched]   = useState(false)
  const [booking,    setBooking]    = useState(null)

  // Filter state
  const [sortBy,     setSortBy]     = useState("fare")
  const [maxFare,    setMaxFare]    = useState(20000)
  const [filterCarrier, setFilterCarrier] = useState("All")

  // Auto-search if params exist
  useEffect(() => {
    if (searchParams.get("from") && searchParams.get("to")) {
      handleSearch()
    }
  }, [])

    async function handleSearch() {
    if (!from || !to || from === to) return
    setSearching(true)
    setSearched(false)

    try {
      // Try real API first
      const data = await fetchSearchFares(from, to, date)
      const real = data.fares ?? []

      if (real.length > 0) {
        // Use real data — enrich with display fields
        const enriched = real.map((f, i) => ({
          ...f,
          flight_number:  f.flight_number ?? `XX-${100+i}`,
          departure_time: f.departure_time ?? ["06:00","08:30","11:00","14:30","18:00"][i%5],
          arrival_time:   f.arrival_time   ?? ["08:10","10:45","13:15","16:40","20:10"][i%5],
          duration:       f.duration       ?? "2h 10m",
          total_fare:     f.total_fare     ?? (f.base_fare + f.taxes),
          total_price:    (f.total_fare ?? (f.base_fare + f.taxes)) * passengers,
          passengers,
          stops:          0,
          ontime:         Math.round(75 + Math.random() * 20),
        }))
        setResults(enriched)
        setMaxFare(Math.max(...enriched.map(f => f.total_fare)) + 1000)
      } else {
        // Fall back to generated data
        const r = generateResults(from, to, date, passengers)
        setResults(r)
        setMaxFare(Math.max(...r.map(f => f.total_fare)) + 1000)
      }
    } catch {
      // Fall back to generated data on error
      const r = generateResults(from, to, date, passengers)
      setResults(r)
      setMaxFare(Math.max(...r.map(f => f.total_fare)) + 1000)
    }

    // Always generate history chart (no real historical per-search data yet)
    setHistory(generatePriceHistory(from, to, date))
    setSearching(false)
    setSearched(true)
  }

  // ── Filtered + sorted results ─────────────────────────────────────────────
  const carriers    = [...new Set(results.map(r => r.carrier))]
  const filtered    = results
    .filter(r =>
      r.total_fare <= maxFare &&
      (filterCarrier === "All" || r.carrier === filterCarrier)
    )
    .sort((a, b) => {
      if (sortBy === "fare")    return a.total_fare - b.total_fare
      if (sortBy === "depart")  return a.departure_time.localeCompare(b.departure_time)
      if (sortBy === "duration")return a.duration.localeCompare(b.duration)
      if (sortBy === "ontime")  return b.ontime - a.ontime
      return 0
    })

  const cheapest    = filtered.length
    ? Math.min(...filtered.map(f => f.total_fare)) : 0

  // ── Carrier price summary ─────────────────────────────────────────────────
  const carrierSummary = carriers.map(c => {
    const cFlights = results.filter(r => r.carrier === c)
    return {
      carrier: c,
      minFare: Math.min(...cFlights.map(f => f.total_fare)),
      count:   cFlights.length,
    }
  }).sort((a,b) => a.minFare - b.minFare)

  const fromAirport = AIRPORTS.find(a => a.code === from)
  const toAirport   = AIRPORTS.find(a => a.code === to)

  return (
    <div style={{ maxWidth:1200, margin:"0 auto",
                  padding:"40px 20px 80px" }}>

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div style={{ marginBottom:32 }}>
        <h1 style={{ fontSize:28, fontWeight:800,
                     color:colors.textPrimary,
                     letterSpacing:"-0.5px", marginBottom:8 }}>
          Search Flights
        </h1>
        <p style={{ fontSize:14, color:colors.textSecondary }}>
          Search across all major Indian carriers ·
          Live fares · Book directly on airline website
        </p>
      </div>

      {/* ── Search form ──────────────────────────────────────────────────── */}
      <div style={{
        marginBottom: 28,
        padding: 24,
        overflow: "visible",
        position: "relative",
        zIndex: 10,
        background: "#0d1528",
        borderRadius: 16,
        border: "1px solid rgba(255, 255, 255, 0.08)",
        boxShadow: "0 12px 36px rgba(0, 0, 0, 0.4)",
      }}>
        <div style={{ display:"flex", gap:12,
                      alignItems:"flex-end", flexWrap:"wrap" }}>

          {/* From */}
          <AirportInput value={from} onChange={setFrom}
            placeholder="From" exclude={to} />

          {/* Swap */}
          <button
            onClick={() => { const t=from; setFrom(to); setTo(t) }}
            style={{
              background: "#111d35",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: 12, color: colors.textPrimary,
              width: 48, height: 48, cursor: "pointer",
              fontSize: 18, flexShrink: 0, display: "flex",
              alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.25)",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.transform="rotate(180deg)"}
            onMouseLeave={e => e.currentTarget.style.transform="rotate(0deg)"}>
            ⇄
          </button>

          {/* To */}
          <AirportInput value={to} onChange={setTo}
            placeholder="To" exclude={from} />

          {/* Date */}
          <div style={{
            background: "#111d35",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: 14, minWidth: 160,
            padding: "14px 18px",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.25)",
          }}>
            <div style={{ fontSize:10, color:colors.textMuted,
                          textTransform:"uppercase",
                          letterSpacing:"0.07em", marginBottom:4 }}>
              Date
            </div>
            <input
              type="date" value={date}
              min={new Date().toISOString().slice(0,10)}
              onChange={e => setDate(e.target.value)}
              style={{
                background:"transparent", border:"none",
                color:colors.textPrimary, fontSize:15,
                fontWeight:700, outline:"none",
                cursor:"pointer", width:"100%",
                colorScheme: "dark",
              }} />
          </div>

          {/* Passengers */}
          <div style={{
            background: "#111d35",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: 14, minWidth: 100,
            padding: "14px 18px",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.25)",
          }}>
            <div style={{ fontSize:10, color:colors.textMuted,
                          textTransform:"uppercase",
                          letterSpacing:"0.07em", marginBottom:4 }}>
              Passengers
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <button onClick={() => setPassengers(Math.max(1, passengers-1))}
                style={{ background:"rgba(255,255,255,0.08)",
                         border:"none", borderRadius:6,
                         color:colors.textPrimary,
                         width:24, height:24, cursor:"pointer",
                         display:"flex", alignItems:"center",
                         justifyContent:"center", fontSize:14,
                         flexShrink:0 }}>−</button>
              <span style={{ fontSize:18, fontWeight:800,
                             color:colors.textPrimary, minWidth:20,
                             textAlign:"center" }}>
                {passengers}
              </span>
              <button onClick={() => setPassengers(Math.min(9, passengers+1))}
                style={{ background:"rgba(255,255,255,0.08)",
                         border:"none", borderRadius:6,
                         color:colors.textPrimary,
                         width:24, height:24, cursor:"pointer",
                         display:"flex", alignItems:"center",
                         justifyContent:"center", fontSize:14,
                         flexShrink:0 }}>+</button>
            </div>
          </div>

          {/* Class */}
          <div style={{
            background: "#111d35",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: 14,
            padding: "14px 18px",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.25)",
          }}>
            <div style={{ fontSize:10, color:colors.textMuted,
                          textTransform:"uppercase",
                          letterSpacing:"0.07em", marginBottom:4 }}>
              Class
            </div>
            <select value={cabinClass}
              onChange={e => setCabinClass(e.target.value)}
              style={{ background:"transparent", border:"none",
                       color:colors.textPrimary, fontSize:14,
                       fontWeight:700, outline:"none",
                       cursor:"pointer" }}>
              {["Economy","Business","First"].map(c => (
                <option key={c} value={c}
                  style={{ background:"#0d1528" }}>{c}</option>
              ))}
            </select>
          </div>

          {/* Search button */}
          <button
            onClick={handleSearch}
            disabled={searching || !from || !to || from === to}
            style={{
              background: searching
                ? "rgba(59,130,246,0.4)"
                : "linear-gradient(135deg, #3b82f6, #1d4ed8)",
              border:"none", borderRadius:14,
              color:"#fff", padding:"18px 32px",
              fontSize:15, fontWeight:700,
              cursor: searching ? "not-allowed" : "pointer",
              whiteSpace:"nowrap",
              boxShadow:"0 4px 20px rgba(59,130,246,0.4)",
              transition:"all 0.15s", letterSpacing:"0.02em",
              opacity: (!from || !to || from === to) ? 0.5 : 1,
            }}>
            {searching ? "Searching..." : "🔍 Search"}
          </button>
        </div>

        {from === to && from && (
          <div style={{ marginTop:12, fontSize:12,
                        color:colors.red }}>
            Origin and destination cannot be the same
          </div>
        )}
      </div>

      {/* ── Searching skeleton ────────────────────────────────────────────── */}
      {searching && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ fontSize:14, color:colors.textSecondary,
                        marginBottom:8, display:"flex",
                        alignItems:"center", gap:10 }}>
            <span className="live-dot" />
            Searching {from} → {to} across all carriers...
          </div>
          {[...Array(5)].map((_,i) => (
            <Skeleton key={i} h={96} radius={14} />
          ))}
        </div>
      )}

      {/* ── Results ───────────────────────────────────────────────────────── */}
      {searched && !searching && (
                  <div style={{
            display:"grid",
            gridTemplateColumns:"clamp(220px, 25%, 280px) 1fr",
            gap:20, alignItems:"start",
          }}
          className="stack-mobile">

          {/* ── Sidebar filters ───────────────────────────────────────────── */}
                    <div style={{ display:"flex", flexDirection:"column",
                        gap:16, position:"sticky", top:80,
                        maxHeight:"calc(100vh - 100px)",
                        overflowY:"auto" }}>

            {/* Route summary */}
            <GlassCard style={{ padding:18 }}>
              <div style={{ fontSize:11, color:colors.textMuted,
                            textTransform:"uppercase",
                            letterSpacing:"0.07em",
                            marginBottom:12 }}>
                Search summary
              </div>
              <div style={{ fontSize:18, fontWeight:800,
                            color:colors.textPrimary,
                            marginBottom:4 }}>
                {from} → {to}
              </div>
              <div style={{ fontSize:12, color:colors.textSecondary,
                            marginBottom:12 }}>
                {new Date(date).toLocaleDateString("en-IN",
                  { weekday:"short", day:"numeric",
                    month:"short", year:"numeric" })} ·{" "}
                {passengers} pax · {cabinClass}
              </div>
              <div style={{ fontSize:13, color:colors.textSecondary }}>
                {filtered.length} flights found
              </div>
            </GlassCard>

            {/* Sort */}
            <GlassCard style={{ padding:18 }}>
              <div style={{ fontSize:11, color:colors.textMuted,
                            textTransform:"uppercase",
                            letterSpacing:"0.07em",
                            marginBottom:12 }}>
                Sort by
              </div>
              <div style={{ display:"flex",
                            flexDirection:"column", gap:6 }}>
                {[
                  { key:"fare",     label:"Lowest fare"   },
                  { key:"depart",   label:"Departure time" },
                  { key:"duration", label:"Duration"      },
                  { key:"ontime",   label:"On-time %"     },
                ].map(s => (
                  <button key={s.key}
                    onClick={() => setSortBy(s.key)}
                    style={{
                      padding:"8px 12px", borderRadius:8,
                      border:"none", cursor:"pointer",
                      textAlign:"left", fontSize:13,
                      fontWeight: sortBy===s.key ? 600 : 400,
                      background: sortBy===s.key
                        ? "rgba(59,130,246,0.15)"
                        : "transparent",
                      color: sortBy===s.key
                        ? colors.blue : colors.textSecondary,
                      transition:"all 0.12s",
                    }}>
                    {sortBy===s.key && "✓ "}{s.label}
                  </button>
                ))}
              </div>
            </GlassCard>

            {/* Carriers */}
            <GlassCard style={{ padding:18 }}>
              <div style={{ fontSize:11, color:colors.textMuted,
                            textTransform:"uppercase",
                            letterSpacing:"0.07em",
                            marginBottom:12 }}>
                Carrier
              </div>
              <div style={{ display:"flex",
                            flexDirection:"column", gap:6 }}>
                {["All", ...carriers].map(c => (
                  <button key={c}
                    onClick={() => setFilterCarrier(c)}
                    style={{
                      padding:"8px 12px", borderRadius:8,
                      border:"none", cursor:"pointer",
                      textAlign:"left", fontSize:13,
                      fontWeight: filterCarrier===c ? 600 : 400,
                      background: filterCarrier===c
                        ? "rgba(59,130,246,0.15)"
                        : "transparent",
                      color: filterCarrier===c
                        ? colors.blue : colors.textSecondary,
                      display:"flex", justifyContent:"space-between",
                    }}>
                    <span>{filterCarrier===c && "✓ "}{c}</span>
                    {c !== "All" && (
                      <span style={{ fontSize:11,
                                     color:colors.textMuted }}>
                        from ₹{carrierSummary
                          .find(cs=>cs.carrier===c)
                          ?.minFare.toLocaleString("en-IN")}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </GlassCard>

            {/* Price range */}
            <GlassCard style={{ padding:18 }}>
              <div style={{ fontSize:11, color:colors.textMuted,
                            textTransform:"uppercase",
                            letterSpacing:"0.07em",
                            marginBottom:12 }}>
                Max fare
              </div>
              <div style={{ fontSize:20, fontWeight:800,
                            color:colors.textPrimary,
                            marginBottom:12 }}>
                ₹{maxFare.toLocaleString("en-IN")}
              </div>
              <input
                type="range"
                min={cheapest}
                max={Math.max(...results.map(f=>f.total_fare)) + 1000}
                value={maxFare}
                onChange={e => setMaxFare(+e.target.value)}
                style={{ width:"100%", accentColor:colors.blue }} />
              <div style={{ display:"flex",
                            justifyContent:"space-between",
                            fontSize:11, color:colors.textMuted,
                            marginTop:6 }}>
                <span>₹{cheapest.toLocaleString("en-IN")}</span>
                <span>₹{Math.max(...results.map(f=>f.total_fare))
                          .toLocaleString("en-IN")}</span>
              </div>
            </GlassCard>
          </div>

          {/* ── Main results ──────────────────────────────────────────────── */}
          <div style={{ display:"flex",
                        flexDirection:"column", gap:16 }}>

            {/* Carrier price bar */}
            <GlassCard style={{ padding:20 }}>
              <div style={{ fontSize:14, fontWeight:600,
                            color:colors.textPrimary,
                            marginBottom:14 }}>
                Cheapest fare by carrier
              </div>
              <ResponsiveContainer width="100%" height={100}>
                <BarChart data={carrierSummary}
                  margin={{ top:0, right:0, left:-20, bottom:0 }}>
                  <XAxis dataKey="carrier"
                         tick={{ fontSize:10, fill:colors.textMuted }}
                         axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    formatter={v => [`₹${v.toLocaleString("en-IN")}`,
                                     "Min fare"]}
                    contentStyle={{ ...glass.strong, borderRadius:10,
                                    border:"none" }}
                  />
                  <Bar dataKey="minFare" radius={[4,4,0,0]}>
                    {carrierSummary.map((c,i) => (
                      <Cell key={i}
                        fill={i===0 ? colors.green : colors.blue}
                        fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </GlassCard>

            {/* Price history */}
            <GlassCard style={{ padding:20 }}>
              <div style={{ fontSize:14, fontWeight:600,
                            color:colors.textPrimary,
                            marginBottom:4 }}>
                Price history for this route
              </div>
              <div style={{ fontSize:12, color:colors.textSecondary,
                            marginBottom:14 }}>
                How fares changed over the booking window
              </div>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={history}
                  margin={{ top:5, right:5, left:-30, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3"
                                 stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="label"
                         tick={{ fontSize:9, fill:colors.textMuted }}
                         interval={8} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize:9, fill:colors.textMuted }}
                         axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={v => [`₹${v.toLocaleString("en-IN")}`,
                                     "Fare"]}
                    contentStyle={{ ...glass.strong, borderRadius:10,
                                    border:"none" }}
                  />
                  <Line type="monotone" dataKey="fare"
                        stroke={colors.blue} strokeWidth={2}
                        dot={false} />
                  <ReferenceLine y={cheapest} stroke={colors.green}
                                 strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            </GlassCard>

            {/* Flight results */}
            <div style={{ display:"flex",
                          flexDirection:"column", gap:12 }}>
              <div style={{ fontSize:14, fontWeight:600,
                            color:colors.textPrimary }}>
                {filtered.length} flights ·{" "}
                <span style={{ color:colors.textSecondary,
                               fontWeight:400 }}>
                  from ₹{cheapest.toLocaleString("en-IN")}
                </span>
              </div>
              {filtered.length === 0 ? (
                <GlassCard style={{ textAlign:"center", padding:40 }}>
                  <div style={{ fontSize:32, marginBottom:12 }}>✈</div>
                  <div style={{ color:colors.textSecondary }}>
                    No flights match your filters
                  </div>
                </GlassCard>
              ) : (
                filtered.map((f, i) => (
                  <FlightCard key={i} flight={f}
                    cheapest={cheapest}
                    onBook={setBooking} />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {!searched && !searching && (
        <GlassCard style={{ textAlign:"center", padding:60 }}>
          <div style={{ fontSize:48, marginBottom:16 }}>✈</div>
          <div style={{ fontSize:20, fontWeight:700,
                        color:colors.textPrimary,
                        marginBottom:8 }}>
            Search for flights
          </div>
          <div style={{ fontSize:14, color:colors.textSecondary,
                        maxWidth:400, margin:"0 auto" }}>
            Select origin, destination and date above.
            We'll search across all major Indian carriers
            and show you the best fares.
          </div>
          {/* Popular routes */}
          <div style={{ marginTop:32 }}>
            <div style={{ fontSize:12, color:colors.textMuted,
                          marginBottom:14, textTransform:"uppercase",
                          letterSpacing:"0.07em" }}>
              Popular routes
            </div>
            <div style={{ display:"flex", gap:10,
                          justifyContent:"center", flexWrap:"wrap" }}>
              {[
                ["DEL","BOM"],["DEL","BLR"],
                ["BOM","BLR"],["DEL","CCU"],
                ["MAA","DEL"],["BLR","HYD"],
              ].map(([f,t]) => (
                <button key={`${f}-${t}`}
                  onClick={() => {
                    setFrom(f); setTo(t)
                    setTimeout(handleSearch, 100)
                  }}
                  style={{
                    padding:"8px 16px", borderRadius:20,
                    border:`1px solid ${colors.glassBorder}`,
                    background:glass.card.background,
                    color:colors.textSecondary, cursor:"pointer",
                    fontSize:13, fontWeight:500,
                    transition:"all 0.15s",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background =
                      "rgba(59,130,246,0.12)"
                    e.currentTarget.style.color = colors.blue
                    e.currentTarget.style.borderColor =
                      "rgba(59,130,246,0.3)"
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background =
                      glass.card.background
                    e.currentTarget.style.color = colors.textSecondary
                    e.currentTarget.style.borderColor =
                      colors.glassBorder
                  }}>
                  {f} → {t}
                </button>
              ))}
            </div>
          </div>
        </GlassCard>
      )}

      {/* Booking panel */}
      {booking && (
        <BookingPanel flight={booking}
          onClose={() => setBooking(null)} />
      )}
    </div>
  )
}
