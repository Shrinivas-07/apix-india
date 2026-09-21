// src/components/FlightRow.jsx
import { colors, glass } from "../styles/theme"

const AIRLINE_COLORS = {
  "IndiGo":    { bg: "rgba(31,102,211,0.15)", border: "rgba(31,102,211,0.3)",  dot: "#1f66d3" },
  "Air India": { bg: "rgba(220,38,38,0.12)",  border: "rgba(220,38,38,0.3)",   dot: "#dc2626" },
  "Akasa":     { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)",  dot: "#f59e0b" },
  "SpiceJet":  { bg: "rgba(234,88,12,0.12)",  border: "rgba(234,88,12,0.3)",   dot: "#ea580c" },
  "Multiple":  { bg: "rgba(59,130,246,0.1)",  border: "rgba(59,130,246,0.25)", dot: "#3b82f6" },
}

export default function FlightRow({ flight, onBook }) {
  const airline = flight.carrier || "Multiple"
  const theme   = AIRLINE_COLORS[airline] || AIRLINE_COLORS["Multiple"]

  return (
    <div style={{
      display: "flex", alignItems: "center",
      justifyContent: "space-between",
      padding: "14px 18px",
      background: theme.bg,
      border: `1px solid ${theme.border}`,
      borderRadius: 12, gap: 12,
      flexWrap: "wrap",
      transition: "transform 0.15s",
    }}
    className="glass-card">

      {/* Airline + dot */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 120 }}>
        <div style={{
          width: 10, height: 10, borderRadius: "50%",
          background: theme.dot, flexShrink: 0,
          boxShadow: `0 0 8px ${theme.dot}`
        }} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 600,
                        color: colors.textPrimary }}>{airline}</div>
          <div style={{ fontSize: 11, color: colors.textSecondary }}>
            {flight.flight_number || "—"}
          </div>
        </div>
      </div>

      {/* Route + times */}
      <div style={{ display: "flex", alignItems: "center",
                    gap: 12, flex: 1 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 700,
                        color: colors.textPrimary }}>
            {flight.departure_time || "--:--"}
          </div>
          <div style={{ fontSize: 11, color: colors.textSecondary }}>
            {flight.origin}
          </div>
        </div>
        <div style={{ textAlign: "center", flex: 1 }}>
          <div style={{ fontSize: 11, color: colors.textMuted }}>
            {flight.duration || "~2h"}
          </div>
          <div style={{ borderTop: `1px solid ${colors.border}`,
                        margin: "4px 0" }} />
          <div style={{ fontSize: 10, color: colors.textMuted }}>Direct</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 700,
                        color: colors.textPrimary }}>
            {flight.arrival_time || "--:--"}
          </div>
          <div style={{ fontSize: 11, color: colors.textSecondary }}>
            {flight.destination}
          </div>
        </div>
      </div>

      {/* Fare */}
      <div style={{ textAlign: "right", minWidth: 100 }}>
        <div style={{ fontSize: 20, fontWeight: 800,
                      color: colors.textPrimary }}>
          ₹{flight.total_fare?.toLocaleString("en-IN") ?? "—"}
        </div>
        <div style={{ fontSize: 11, color: colors.textSecondary }}>
          Base ₹{flight.base_fare?.toLocaleString("en-IN") ?? "—"}
        </div>
      </div>

      {/* Book button */}
      <button
        onClick={() => onBook && onBook(flight)}
        className="full-mobile"
        style={{
          background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
          border: "none", borderRadius: 10,
          color: "#fff", padding: "10px 20px",
          fontSize: 13, fontWeight: 600,
          cursor: "pointer", whiteSpace: "nowrap",
          boxShadow: "0 4px 16px rgba(59,130,246,0.35)",
          transition: "all 0.15s",
        }}
        
      
        onMouseEnter={e => e.target.style.transform = "scale(1.04)"}
        onMouseLeave={e => e.target.style.transform = "scale(1)"}>
        Book Now →
      </button>
    </div>
  )
}