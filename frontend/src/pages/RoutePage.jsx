// src/pages/RoutePage.jsx
import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell
} from "recharts"
import FareRangeChart from "../components/FareRangeChart"
import GlassCard    from "../components/GlassCard"
import LiveBadge    from "../components/LiveBadge"
import Skeleton     from "../components/Skeleton"
import FlightRow    from "../components/FlightRow"
import BookingPanel from "../components/BookingPanel"
import { fetchRouteDetail, fetchIndexHistory } from "../api"
import { colors, glass } from "../styles/theme"

// ── Route config ──────────────────────────────────────────────────────────────
const ROUTE_META = {
  "DEL-BOM": { from:"Delhi", to:"Mumbai",     distance:"1,148 km", duration:"2h 10m", airports:["IGI","CSIA"] },
  "DEL-BLR": { from:"Delhi", to:"Bengaluru",  distance:"1,740 km", duration:"2h 45m", airports:["IGI","KIA"]  },
  "BOM-BLR": { from:"Mumbai", to:"Bengaluru", distance:"845 km",  duration:"1h 35m", airports:["CSIA","KIA"] },
  "DEL-CCU": { from:"Delhi", to:"Kolkata",    distance:"1,305 km", duration:"2h 25m", airports:["IGI","NSCBI"]},
  "MAA-DEL": { from:"Chennai", to:"Delhi",    distance:"1,754 km", duration:"2h 45m", airports:["MAA","IGI"]  },
  "BLR-HYD": { from:"Bengaluru", to:"Hyderabad", distance:"500 km", duration:"1h 10m", airports:["KIA","RGI"] },
  "BOM-HYD": { from:"Mumbai", to:"Hyderabad", distance:"620 km",  duration:"1h 25m", airports:["CSIA","RGI"] },
  "CCU-BOM": { from:"Kolkata", to:"Mumbai",   distance:"1,660 km", duration:"2h 55m", airports:["NSCBI","CSIA"]},
}

// ── Mock data generators ──────────────────────────────────────────────────────
function generatePriceCalendar(basefare) {
  const days = []
  const today = new Date()
  for (let i = 1; i <= 45; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    const dow     = d.getDay()
    const isWknd  = dow === 0 || dow === 6
    const factor  = isWknd ? 1.15 : 1.0
    const advance = i <= 3  ? 1.4
                  : i <= 7  ? 1.2
                  : i <= 15 ? 1.0
                  : i <= 30 ? 0.92
                  : 0.95
    const noise   = 0.92 + Math.random() * 0.16
    const fare    = Math.round(basefare * factor * advance * noise)
    days.push({
      date:    d.toISOString().slice(0, 10),
      display: d.toLocaleDateString("en-IN", { day:"numeric", month:"short" }),
      day:     d.toLocaleDateString("en-IN", { weekday:"short" }),
      fare,
      advance: i,
      isWknd,
      isCheap: fare < basefare * 0.95,
    })
  }
  return days
}

function generateCarrierData(basefare) {
  return [
    { carrier:"IndiGo",    code:"6E", fare: Math.round(basefare * 0.94),
      share:38, ontime:87, rating:4.1 },
    { carrier:"Air India", code:"AI", fare: Math.round(basefare * 1.08),
      share:22, ontime:79, rating:3.9 },
    { carrier:"Akasa",     code:"QP", fare: Math.round(basefare * 0.97),
      share:18, ontime:91, rating:4.3 },
    { carrier:"SpiceJet",  code:"SG", fare: Math.round(basefare * 1.03),
      share:14, ontime:72, rating:3.6 },
    { carrier:"Air India Express", code:"IX", fare: Math.round(basefare * 0.89),
      share:8,  ontime:83, rating:3.8 },
  ]
}

function generateHourlyFares(basefare) {
  const hours = []
  for (let h = 5; h <= 22; h++) {
    const isPeak = (h >= 7 && h <= 9) || (h >= 17 && h <= 19)
    const factor = isPeak ? 1.18 : h < 7 || h > 20 ? 0.88 : 1.0
    const noise  = 0.95 + Math.random() * 0.1
    hours.push({
      hour:  `${String(h).padStart(2,"0")}:00`,
      fare:  Math.round(basefare * factor * noise),
      peak:  isPeak,
    })
  }
  return hours
}

// ── Price calendar cell ───────────────────────────────────────────────────────
function CalendarCell({ day, minFare, maxFare, onClick, selected }) {
  const pct    = (day.fare - minFare) / (maxFare - minFare)
  const r      = Math.round(pct * 239)
  const g      = Math.round((1 - pct) * 185)
  const bg     = `rgba(${r}, ${g}, 80, 0.15)`
  const border = selected
    ? `1px solid ${colors.blue}`
    : `1px solid rgba(${r}, ${g}, 80, 0.25)`

  return (
    <div
      onClick={() => onClick(day)}
      style={{
        background: bg, border, borderRadius: 10,
        padding: "10px 8px", textAlign: "center",
        cursor: "pointer", transition: "all 0.15s",
        minWidth: 72,
        boxShadow: selected ? `0 0 12px rgba(59,130,246,0.4)` : "none",
      }}
      onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
      onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
      <div style={{ fontSize: 10, color: colors.textMuted }}>{day.day}</div>
      <div style={{ fontSize: 11, color: colors.textSecondary,
                    marginBottom: 4 }}>{day.display}</div>
      <div style={{ fontSize: 13, fontWeight: 700,
                    color: day.isCheap ? "#10b981" : colors.textPrimary }}>
        ₹{(day.fare / 1000).toFixed(1)}k
      </div>
      {day.isCheap && (
        <div style={{ fontSize: 9, color: "#10b981",
                      fontWeight: 600, marginTop: 2 }}>CHEAP</div>
      )}
    </div>
  )
}

// ── Carrier card ──────────────────────────────────────────────────────────────
function CarrierCard({ carrier, cheapest, onBook }) {
  const isCheapest = carrier.fare === cheapest
  return (
    <div style={{
      ...glass.card, padding: "16px 18px",
      borderRadius: 14, position: "relative",
      border: isCheapest
        ? "1px solid rgba(16,185,129,0.4)"
        : `1px solid ${colors.glassBorder}`,
      transition: "all 0.15s",
    }}
    className="glass-card">
      {isCheapest && (
        <div style={{
          position: "absolute", top: -10, left: 16,
          background: "linear-gradient(135deg, #059669, #10b981)",
          color: "#fff", fontSize: 10, fontWeight: 700,
          padding: "2px 10px", borderRadius: 99,
        }}>CHEAPEST</div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between",
                    alignItems: "flex-start", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700,
                        color: colors.textPrimary }}>{carrier.carrier}</div>
          <div style={{ fontSize: 12, color: colors.textMuted }}>
            {carrier.code} · {carrier.share}% market share
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 22, fontWeight: 800,
                        color: isCheapest ? "#10b981" : colors.textPrimary }}>
            ₹{carrier.fare.toLocaleString("en-IN")}
          </div>
          <div style={{ fontSize: 11, color: colors.textMuted }}>avg base fare</div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 16, marginBottom: 14 }}>
        {[
          { label:"On-time", value:`${carrier.ontime}%` },
          { label:"Rating",  value:`${carrier.rating}★` },
          { label:"Share",   value:`${carrier.share}%`  },
        ].map(s => (
          <div key={s.label}>
            <div style={{ fontSize: 10, color: colors.textMuted,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em" }}>
              {s.label}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600,
                          color: colors.textPrimary }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* On-time bar */}
      <div style={{ height: 4, background: "rgba(255,255,255,0.06)",
                    borderRadius: 2, marginBottom: 14 }}>
        <div style={{
          height: "100%", width: `${carrier.ontime}%`,
          background: carrier.ontime >= 85
            ? "linear-gradient(90deg, #059669, #10b981)"
            : carrier.ontime >= 75
            ? "linear-gradient(90deg, #d97706, #f59e0b)"
            : "linear-gradient(90deg, #dc2626, #ef4444)",
          borderRadius: 2,
        }} />
      </div>

      <button
        onClick={() => onBook(carrier)}
        style={{
          width: "100%",
          background: isCheapest
            ? "linear-gradient(135deg, #059669, #10b981)"
            : "linear-gradient(135deg, #3b82f6, #1d4ed8)",
          border: "none", borderRadius: 10,
          color: "#fff", padding: "10px",
          fontSize: 13, fontWeight: 600,
          cursor: "pointer",
          boxShadow: isCheapest
            ? "0 4px 16px rgba(16,185,129,0.3)"
            : "0 4px 16px rgba(59,130,246,0.3)",
          transition: "all 0.15s",
        }}
        onMouseEnter={e => e.target.style.opacity = "0.9"}
        onMouseLeave={e => e.target.style.opacity = "1"}>
        Book on {carrier.carrier} →
      </button>
    </div>
  )
}

// ── Tab button ────────────────────────────────────────────────────────────────
function Tab({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "8px 18px", borderRadius: 8,
      border: "none", cursor: "pointer",
      fontSize: 13, fontWeight: 500,
      background: active
        ? "linear-gradient(135deg, #3b82f6, #1d4ed8)"
        : "rgba(255,255,255,0.05)",
      color: active ? "#fff" : colors.textSecondary,
      boxShadow: active ? "0 4px 12px rgba(59,130,246,0.3)" : "none",
      transition: "all 0.15s", whiteSpace: "nowrap",
    }}>
      {label}
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function RoutePage() {
  const { id }      = useParams()
  const navigate    = useNavigate()
  const [loading,   setLoading]   = useState(true)
  const [detail,    setDetail]    = useState(null)
  const [tab,       setTab]       = useState("overview")
  const [selDate,   setSelDate]   = useState(null)
  const [booking,   setBooking]   = useState(null)

  const meta       = ROUTE_META[id] ?? ROUTE_META["DEL-BOM"]
  const [from, to] = (id ?? "DEL-BOM").split("-")
  const basefare   = detail?.lead_time_curve?.[1]?.avg_fare ?? 4200

  // Generated data
  const calendar   = generatePriceCalendar(basefare)
  const carriers   = generateCarrierData(basefare)
  const hourly     = generateHourlyFares(basefare)
  const cheapCarrier = Math.min(...carriers.map(c => c.fare))
  const minFare    = Math.min(...calendar.map(d => d.fare))
  const maxFare    = Math.max(...calendar.map(d => d.fare))
  const cheapDays  = calendar.filter(d => d.isCheap)

  useEffect(() => {
    setLoading(true)
    fetchRouteDetail(from, to)
      .then(setDetail)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  // ── Savings calculation ───────────────────────────────────────────────────
  const t1fare  = detail?.lead_time_curve?.find(l => l.advance_days === 1)?.avg_fare
  const t15fare = detail?.lead_time_curve?.find(l => l.advance_days === 15)?.avg_fare
  const savings = t1fare && t15fare
    ? Math.round(((t1fare - t15fare) / t1fare) * 100) : 0

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto",
                  padding: "40px 20px 80px" }}>

      {/* ── Back button ──────────────────────────────────────────────────── */}
      <button
        onClick={() => navigate("/routes")}
        style={{
          background: "rgba(255,255,255,0.05)",
          border: `1px solid ${colors.border}`,
          borderRadius: 8, color: colors.textSecondary,
          padding: "8px 16px", cursor: "pointer",
          fontSize: 13, marginBottom: 24,
          display: "flex", alignItems: "center", gap: 8,
        }}>
        ← Back to routes
      </button>

      {/* ── Hero header ──────────────────────────────────────────────────── */}
      <GlassCard style={{ marginBottom: 24, padding: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between",
                      alignItems: "flex-start", flexWrap: "wrap", gap: 20 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center",
                          gap: 12, marginBottom: 12 }}>
              <h1 style={{
                fontSize: 36, fontWeight: 900, letterSpacing: "-1px",
                background: "linear-gradient(135deg, #f0f4ff, #60a5fa)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>
                {from} → {to}
              </h1>
              <LiveBadge />
            </div>
            <div style={{ fontSize: 16, color: colors.textSecondary,
                          marginBottom: 8 }}>
              {meta.from} → {meta.to}
            </div>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              {[
                { label:"Distance",  value: meta.distance },
                { label:"Duration",  value: meta.duration },
                { label:"Airports",  value: meta.airports.join(" · ") },
                { label:"Weight",    value: `${detail?.weight ?? "—"}%` },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ fontSize: 10, color: colors.textMuted,
                                textTransform: "uppercase",
                                letterSpacing: "0.07em" }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600,
                                color: colors.textPrimary }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick stats */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {[
              { label:"Cheapest carrier",
                value: `₹${cheapCarrier.toLocaleString("en-IN")}`,
                color: colors.green },
              { label:"Last-minute",
                value: t1fare ? `₹${t1fare.toLocaleString("en-IN")}` : "—",
                color: colors.red },
              { label:"Book T+15 save",
                value: `${savings}%`, color: colors.blue },
            ].map(s => (
              <div key={s.label} style={{
                ...glass.subtle, padding: "14px 20px",
                borderRadius: 12, textAlign: "center",
              }}>
                <div style={{ fontSize: 10, color: colors.textMuted,
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                              marginBottom: 6 }}>
                  {s.label}
                </div>
                <div style={{ fontSize: 22, fontWeight: 800,
                              color: s.color }}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24,
                    flexWrap: "wrap" }}>
        {[
          { key:"overview",  label:"Overview"       },
          { key:"calendar",  label:"Price Calendar" },
          { key:"carriers",  label:"All Carriers"   },
          { key:"timing",    label:"Best Time"      },
          { key:"history",   label:"History"        },
        ].map(t => (
          <Tab key={t.key} label={t.label}
               active={tab === t.key}
               onClick={() => setTab(t.key)} />
        ))}
      </div>

      {/* ── Tab: Overview ────────────────────────────────────────────────── */}
      {tab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Lead time curve */}
          <GlassCard>
            <div style={{ fontSize: 16, fontWeight: 700,
                          color: colors.textPrimary, marginBottom: 6 }}>
              Lead-time Elasticity Curve
            </div>
            <div style={{ fontSize: 12, color: colors.textSecondary,
                          marginBottom: 20 }}>
              How base fare changes with advance booking ·
              T+1 = last minute · T+45 = 6 weeks ahead
            </div>
            {loading ? <Skeleton h={260} radius={8} /> : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart
                  data={detail?.lead_time_curve ?? []}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ltGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={colors.blue} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={colors.blue} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3"
                                 stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="advance_days"
                         tickFormatter={v => `T+${v}`}
                         tick={{ fontSize: 11, fill: colors.textMuted }}
                         axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: colors.textMuted }}
                         tickFormatter={v => `₹${(v/1000).toFixed(1)}k`}
                         axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(v, n) => [`₹${v?.toLocaleString("en-IN")}`, n]}
                    labelFormatter={l => `T+${l} days advance`}
                    contentStyle={{
                      ...glass.strong, border: "none",
                      borderRadius: 12,
                    }}
                  />
                  <Area type="monotone" dataKey="avg_fare" name="Avg fare"
                        stroke={colors.blue} strokeWidth={2.5}
                        fill="url(#ltGrad)"
                        dot={{ r: 5, fill: colors.blue,
                               strokeWidth: 2, stroke: "#0d1528" }} />
                  <Line type="monotone" dataKey="min_fare" name="Min fare"
                        stroke={colors.green} strokeWidth={1.5}
                        strokeDasharray="4 4" dot={false} />
                  <Line type="monotone" dataKey="max_fare" name="Max fare"
                        stroke={colors.red} strokeWidth={1.5}
                        strokeDasharray="4 4" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}

            {/* Insight box */}
            {!loading && savings > 0 && (
              <div style={{
                marginTop: 16, padding: "14px 18px",
                background: "rgba(16,185,129,0.08)",
                border: "1px solid rgba(16,185,129,0.2)",
                borderRadius: 10,
                display: "flex", alignItems: "center",
                gap: 12,
              }}>
                <span style={{ fontSize: 20 }}>💡</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600,
                                color: "#10b981" }}>
                    Book 15 days ahead and save {savings}%
                  </div>
                  <div style={{ fontSize: 12, color: colors.textSecondary }}>
                    vs buying last minute (T+1).
                    Sweet spot is T+15 for this route.
                  </div>
                </div>
              </div>
            )}
          </GlassCard>

          {/* Top flights today */}
          <GlassCard>
            <div style={{ fontSize: 16, fontWeight: 700,
                          color: colors.textPrimary, marginBottom: 6 }}>
              Today's Best Fares
            </div>
            <div style={{ fontSize: 12, color: colors.textSecondary,
                          marginBottom: 20 }}>
              Sorted by price · Click Book Now to open airline
            </div>
            <div style={{ display: "flex",
                          flexDirection: "column", gap: 10 }}>
              {carriers
                .sort((a,b) => a.fare - b.fare)
                .map((c, i) => (
                  <FlightRow key={i}
                    flight={{
                      carrier:      c.carrier,
                      flight_number: `${c.code}-${100 + i * 101}`,
                      departure_time: ["06:00","08:30","11:00","14:30","18:00"][i],
                      arrival_time: ["08:10","10:45","13:15","16:40","20:10"][i],
                      duration:     meta.duration,
                      total_fare:   Math.round(c.fare * 1.18),
                      base_fare:    c.fare,
                      taxes:        Math.round(c.fare * 0.18),
                      origin:       from,
                      destination:  to,
                      travel_date:  new Date(Date.now()+86400000)
                                      .toISOString().slice(0,10),
                      fare_class:   "Economy",
                    }}
                    onBook={f => setBooking(f)}
                  />
                ))}
            </div>
          </GlassCard>
        </div>
      )}

      {/* ── Tab: Price Calendar ───────────────────────────────────────────── */}
      {tab === "calendar" && (
        <GlassCard>
          <div style={{ display: "flex", justifyContent: "space-between",
                        alignItems: "flex-start", marginBottom: 20,
                        flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700,
                            color: colors.textPrimary }}>
                Price Calendar — Next 45 Days
              </div>
              <div style={{ fontSize: 12, color: colors.textSecondary,
                            marginTop: 4 }}>
                Green = cheapest days · Click any date to see fares
              </div>
            </div>
            <div style={{ display: "flex", gap: 16, fontSize: 12,
                          color: colors.textSecondary }}>
              <span>
                🟢 Min ₹{minFare.toLocaleString("en-IN")}
              </span>
              <span>
                🔴 Max ₹{maxFare.toLocaleString("en-IN")}
              </span>
              <span>
                💚 {cheapDays.length} cheap days
              </span>
            </div>
          </div>

          {/* Calendar grid */}
          <div style={{ display: "flex", flexWrap: "wrap",
                        gap: 8, marginBottom: 24 }}>
            {calendar.map((day, i) => (
              <CalendarCell key={i} day={day}
                minFare={minFare} maxFare={maxFare}
                selected={selDate?.date === day.date}
                onClick={setSelDate} />
            ))}
          </div>

          {/* Selected date detail */}
          {selDate && (
            <div style={{
              padding: 20,
              background: "rgba(59,130,246,0.08)",
              border: "1px solid rgba(59,130,246,0.2)",
              borderRadius: 14,
            }}>
              <div style={{ fontSize: 15, fontWeight: 700,
                            color: colors.textPrimary, marginBottom: 12 }}>
                {selDate.display} ({selDate.day})
              </div>
              <div style={{ display: "flex", gap: 24,
                            flexWrap: "wrap", marginBottom: 16 }}>
                {[
                  { label:"Estimated fare", value:`₹${selDate.fare.toLocaleString("en-IN")}` },
                  { label:"Advance",        value:`T+${selDate.advance} days` },
                  { label:"Day type",       value: selDate.isWknd ? "Weekend" : "Weekday" },
                  { label:"Price level",    value: selDate.isCheap ? "🟢 Cheap" : "Normal" },
                ].map(s => (
                  <div key={s.label}>
                    <div style={{ fontSize: 10, color: colors.textMuted,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.06em" }}>
                      {s.label}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700,
                                  color: colors.textPrimary }}>
                      {s.value}
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setBooking({
                  origin: from, destination: to,
                  total_fare: selDate.fare,
                  base_fare: Math.round(selDate.fare * 0.82),
                  taxes: Math.round(selDate.fare * 0.18),
                  travel_date: selDate.date,
                  carrier: "Best available",
                  fare_class: "Economy",
                })}
                style={{
                  background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                  border: "none", borderRadius: 10,
                  color: "#fff", padding: "10px 24px",
                  fontSize: 13, fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 4px 16px rgba(59,130,246,0.3)",
                }}>
                Book for {selDate.display} →
              </button>
            </div>
          )}
        </GlassCard>
      )}

      {/* ── Tab: All Carriers ─────────────────────────────────────────────── */}
      {tab === "carriers" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 16,
          }}>
            {carriers
              .sort((a,b) => a.fare - b.fare)
              .map((c, i) => (
                <CarrierCard key={i} carrier={c}
                  cheapest={cheapCarrier}
                  onBook={c => setBooking({
                    carrier:     c.carrier,
                    origin:      from,
                    destination: to,
                    total_fare:  Math.round(c.fare * 1.18),
                    base_fare:   c.fare,
                    taxes:       Math.round(c.fare * 0.18),
                    fare_class:  "Economy",
                    travel_date: new Date(Date.now()+86400000)
                                   .toISOString().slice(0,10),
                  })}
                />
              ))}
          </div>

          {/* Carrier comparison chart */}
          <GlassCard>
            <div style={{ fontSize: 15, fontWeight: 700,
                          color: colors.textPrimary, marginBottom: 16 }}>
              Carrier Fare Comparison
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={carriers}
                margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3"
                               stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="carrier"
                       tick={{ fontSize: 11, fill: colors.textMuted }}
                       axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: colors.textMuted }}
                       tickFormatter={v => `₹${(v/1000).toFixed(0)}k`}
                       axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={v => [`₹${v.toLocaleString("en-IN")}`, "Base fare"]}
                  contentStyle={{ ...glass.strong, borderRadius: 12, border:"none" }}
                />
                <Bar dataKey="fare" radius={[6,6,0,0]}>
                  {carriers.map((c, i) => (
                    <Cell key={i}
                      fill={c.fare === cheapCarrier ? colors.green : colors.blue}
                      fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>
        </div>
      )}

      {/* ── Tab: Best Time ────────────────────────────────────────────────── */}
      {tab === "timing" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Hourly fare chart */}
          <GlassCard>
            <div style={{ fontSize: 16, fontWeight: 700,
                          color: colors.textPrimary, marginBottom: 6 }}>
              Fare by Departure Time
            </div>
            <div style={{ fontSize: 12, color: colors.textSecondary,
                          marginBottom: 20 }}>
              Early morning and late night flights are typically cheaper
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={hourly}
                margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3"
                               stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="hour"
                       tick={{ fontSize: 10, fill: colors.textMuted }}
                       axisLine={false} tickLine={false}
                       interval={2} />
                <YAxis tick={{ fontSize: 10, fill: colors.textMuted }}
                       tickFormatter={v => `₹${(v/1000).toFixed(1)}k`}
                       axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={v => [`₹${v.toLocaleString("en-IN")}`, "Fare"]}
                  contentStyle={{ ...glass.strong, borderRadius: 12,
                                  border: "none" }}
                />
                <Bar dataKey="fare" radius={[4,4,0,0]}>
                  {hourly.map((h, i) => (
                    <Cell key={i}
                      fill={h.peak ? colors.red : colors.blue}
                      fillOpacity={h.peak ? 0.9 : 0.6} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", gap: 16,
                          marginTop: 12, fontSize: 12,
                          color: colors.textSecondary }}>
              <span style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ width:10, height:10, borderRadius:2,
                               background: colors.red,
                               display:"inline-block" }} />
                Peak hours (higher fare)
              </span>
              <span style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ width:10, height:10, borderRadius:2,
                               background: colors.blue,
                               display:"inline-block" }} />
                Off-peak (cheaper)
              </span>
            </div>
          </GlassCard>

          {/* Tips */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))",
            gap: 14,
          }}>
            {[
              { icon:"🌙", title:"Fly early morning",
                tip:"05:00–07:00 flights are 15-20% cheaper on average",
                color: colors.blue },
              { icon:"📅", title:"Book 15 days ahead",
                tip:`Save up to ${savings}% vs last-minute booking`,
                color: colors.green },
              { icon:"📆", title:"Avoid weekends",
                tip:"Weekend fares are 10-15% higher due to demand",
                color: colors.amber },
              { icon:"🏷", title:"Tuesday is cheapest",
                tip:"Mid-week flights average 8% lower than Mon/Fri",
                color: colors.purple },
            ].map(tip => (
              <GlassCard key={tip.title}
                style={{ borderLeft: `3px solid ${tip.color}` }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>
                  {tip.icon}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600,
                              color: colors.textPrimary,
                              marginBottom: 6 }}>
                  {tip.title}
                </div>
                <div style={{ fontSize: 12, color: colors.textSecondary,
                              lineHeight: 1.6 }}>
                  {tip.tip}
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* ── Tab: History ──────────────────────────────────────────────────── */}
      {tab === "history" && (
        <GlassCard>
          <div style={{ fontSize: 16, fontWeight: 700,
                        color: colors.textPrimary, marginBottom: 6 }}>
            Historical Fare Trend — {from} → {to}
          </div>
          <div style={{ fontSize: 12, color: colors.textSecondary,
                        marginBottom: 20 }}>
            Average base fare over time · T+7 advance window
          </div>
          {loading ? <Skeleton h={280} radius={8} /> : (
            detail?.lead_time_curve?.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart
                  data={detail.lead_time_curve}
                  margin={{ top:10, right:10, left:-10, bottom:0 }}>
                  <defs>
                    <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={colors.purple}
                            stopOpacity={0.3} />
                      <stop offset="95%" stopColor={colors.purple}
                            stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3"
                                 stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="advance_days"
                         tickFormatter={v => `T+${v}`}
                         tick={{ fontSize:11, fill:colors.textMuted }}
                         axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize:10, fill:colors.textMuted }}
                         tickFormatter={v => `₹${(v/1000).toFixed(1)}k`}
                         axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={v => [`₹${v?.toLocaleString("en-IN")}`, "Avg fare"]}
                    labelFormatter={l => `T+${l} days`}
                    contentStyle={{ ...glass.strong, borderRadius:12,
                                    border:"none" }}
                  />
                  <Area type="monotone" dataKey="avg_fare"
                        stroke={colors.purple} strokeWidth={2.5}
                        fill="url(#histGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height:280, display:"flex",
                            alignItems:"center", justifyContent:"center",
                            color: colors.textMuted }}>
                Run the scraper to collect historical data for this route
              </div>
            )
          )}

                      {/* Fare range chart */}
            {detail?.lead_time_curve?.length > 0 && (
              <div style={{ marginTop:24 }}>
                <div style={{ fontSize:14, fontWeight:600,
                              color:colors.textPrimary,
                              marginBottom:4 }}>
                  Fare Range Analysis
                </div>
                <div style={{ fontSize:12, color:colors.textSecondary,
                              marginBottom:14 }}>
                  Min · Avg · Max range per booking window
                </div>
                <FareRangeChart
                  data={detail.lead_time_curve}
                  height={220}
                />
              </div>
            )}

          {/* Route stats table */}
          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 600,
                          color: colors.textPrimary, marginBottom: 14 }}>
              Lead-time Analysis
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse",
                              fontSize:13 }}>
                <thead>
                  <tr>
                    {["Advance","Avg Fare","Min Fare",
                      "Max Fare","Samples","vs T+1"].map(h => (
                      <th key={h} style={{
                        padding: "10px 14px", textAlign:"left",
                        fontSize:11, color:colors.textMuted,
                        textTransform:"uppercase",
                        letterSpacing:"0.07em",
                        borderBottom: `1px solid ${colors.border}`,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(detail?.lead_time_curve ?? []).map((row, i) => {
                    const t1 = detail?.lead_time_curve?.[0]?.avg_fare
                    const saving = t1
                      ? Math.round((t1 - row.avg_fare) / t1 * 100) : 0
                    return (
                      <tr key={i} style={{
                        borderBottom: `1px solid ${colors.border}`,
                      }}>
                        <td style={{ padding:"12px 14px", fontWeight:700,
                                     color:colors.blue,
                                     fontFamily:"monospace" }}>
                          T+{row.advance_days}
                        </td>
                        <td style={{ padding:"12px 14px", fontWeight:600,
                                     color:colors.textPrimary }}>
                          ₹{row.avg_fare?.toLocaleString("en-IN")}
                        </td>
                        <td style={{ padding:"12px 14px",
                                     color:colors.green }}>
                          ₹{row.min_fare?.toLocaleString("en-IN")}
                        </td>
                        <td style={{ padding:"12px 14px",
                                     color:colors.red }}>
                          ₹{row.max_fare?.toLocaleString("en-IN")}
                        </td>
                        <td style={{ padding:"12px 14px",
                                     color:colors.textSecondary }}>
                          {row.sample_count}
                        </td>
                        <td style={{ padding:"12px 14px" }}>
                          <span style={{
                            color: saving > 0 ? colors.green : colors.red,
                            fontWeight:600,
                          }}>
                            {saving > 0 ? `-${saving}%` : `+${Math.abs(saving)}%`}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </GlassCard>
      )}

      {/* ── Booking panel ─────────────────────────────────────────────────── */}
      {booking && (
        <BookingPanel
          flight={booking}
          onClose={() => setBooking(null)}
        />
      )}
    </div>
  )
}