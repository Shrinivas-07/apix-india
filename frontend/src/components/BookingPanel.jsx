// src/components/BookingPanel.jsx
// Slide-in panel when user clicks Book Now
import { colors, glass } from "../styles/theme"

// Deep link builders for each airline/OTA
function buildBookingUrl(flight, airline) {
  const origin = flight.origin || "DEL"
  const dest   = flight.destination || "BOM"
  const date   = flight.travel_date || new Date(
    Date.now() + 86400000
  ).toISOString().slice(0, 10)

  // Format date as DDMMYYYY for MMT
  const d      = new Date(date)
  const ddmm   = `${String(d.getDate()).padStart(2,"0")}${String(d.getMonth()+1).padStart(2,"0")}${d.getFullYear()}`

  const urls = {
    "IndiGo": `https://www.goindigo.in/flight-booking.html?origin=${origin}&destination=${dest}&departure=${date}&adult=1&child=0&infant=0&travelClass=ECONOMY&tripType=O`,
    "Air India": `https://www.airindia.com/in/en/book/flights.html?tripType=O&src=${origin}&dst=${dest}&departDate=${date}&adult=1&child=0&infant=0&cabin=E`,
    "Akasa": `https://www.akasaair.com/booking?from=${origin}&to=${dest}&depart=${date}&adults=1&type=OW`,
    "SpiceJet": `https://book.spicejet.com/?from=${origin}&to=${dest}&depart_date=${date}&adults=1&child=0&infant=0&way=O`,
    "MakeMyTrip": `https://www.makemytrip.com/flight/search?itinerary=${origin}-${dest}-${ddmm}&tripType=O&paxType=A-1_C-0_I-0&intl=false`,
    "Cleartrip": `https://www.cleartrip.com/flights/results?from=${origin}&to=${dest}&depart_date=${date}&adults=1&childs=0&infants=0&class=Economy&airline=&page=loaded`,
    "Ixigo": `https://www.ixigo.com/search/result/flight?from=${origin}&to=${dest}&date=${date}&adults=1&children=0&infants=0&class=e&source=Search%20Form`,
  }

  return urls[airline] || urls["MakeMyTrip"]
}

export default function BookingPanel({ flight, onClose }) {
  if (!flight) return null

  const bookingLinks = [
    { name: "IndiGo",    emoji: "🔵", color: "#1f66d3" },
    { name: "Air India", emoji: "🔴", color: "#dc2626" },
    { name: "Akasa",     emoji: "🟡", color: "#f59e0b" },
    { name: "SpiceJet",  emoji: "🟠", color: "#ea580c" },
    { name: "MakeMyTrip",emoji: "🟣", color: "#8b5cf6" },
    { name: "Ixigo",     emoji: "🟢", color: "#10b981" },
  ]

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
          zIndex: 2000,
        }} />

      {/* Panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: "min(460px, 100vw)",
        zIndex: 2001,
        ...glass.strong,
        borderRadius: "20px 0 0 20px",
        padding: 28,
        animation: "slide-in-right 0.3s ease",
        overflowY: "auto",
        display: "flex", flexDirection: "column", gap: 24,
      }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between",
                      alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700,
                          color: colors.textPrimary }}>
              Book this flight
            </div>
            <div style={{ fontSize: 13, color: colors.textSecondary,
                          marginTop: 4 }}>
              Choose your preferred platform
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.08)",
            border: `1px solid ${colors.border}`,
            borderRadius: 8, color: colors.textPrimary,
            width: 36, height: 36, cursor: "pointer",
            fontSize: 16, display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>✕</button>
        </div>

        {/* Flight summary */}
        <div style={{
          background: "rgba(59,130,246,0.08)",
          border: "1px solid rgba(59,130,246,0.2)",
          borderRadius: 14, padding: 20,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between",
                        alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 24, fontWeight: 800,
                          color: colors.textPrimary }}>
              {flight.origin} → {flight.destination}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800,
                          color: "#60a5fa" }}>
              ₹{flight.total_fare?.toLocaleString("en-IN")}
            </div>
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {[
              { label: "Carrier",   value: flight.carrier || "Any" },
              { label: "Date",      value: flight.travel_date || "Tomorrow" },
              { label: "Class",     value: flight.fare_class || "Economy" },
              { label: "Base fare", value: `₹${flight.base_fare?.toLocaleString("en-IN") || "—"}` },
            ].map(item => (
              <div key={item.label}>
                <div style={{ fontSize: 10, color: colors.textMuted,
                              textTransform: "uppercase",
                              letterSpacing: "0.06em" }}>{item.label}</div>
                <div style={{ fontSize: 13, fontWeight: 600,
                              color: colors.textPrimary }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Booking links */}
        <div>
          <div style={{ fontSize: 12, color: colors.textSecondary,
                        marginBottom: 14, textTransform: "uppercase",
                        letterSpacing: "0.07em" }}>
            Book on
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {bookingLinks.map(site => (
              <a
                key={site.name}
                href={buildBookingUrl(flight, site.name)}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex", alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 18px",
                  background: `rgba(${hexToRgb(site.color)}, 0.08)`,
                  border: `1px solid rgba(${hexToRgb(site.color)}, 0.2)`,
                  borderRadius: 12, textDecoration: "none",
                  transition: "all 0.15s",
                  cursor: "pointer",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = `rgba(${hexToRgb(site.color)}, 0.15)`
                  e.currentTarget.style.transform = "translateX(4px)"
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = `rgba(${hexToRgb(site.color)}, 0.08)`
                  e.currentTarget.style.transform = "translateX(0)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 20 }}>{site.emoji}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600,
                                  color: colors.textPrimary }}>{site.name}</div>
                    <div style={{ fontSize: 11, color: colors.textSecondary }}>
                      Opens in new tab
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 18, color: site.color }}>→</div>
              </a>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <div style={{
          fontSize: 11, color: colors.textMuted,
          lineHeight: 1.6, marginTop: "auto",
          padding: "14px", background: "rgba(255,255,255,0.02)",
          borderRadius: 10, border: `1px solid ${colors.border}`,
        }}>
          ⓘ Fares shown are scraped data and may differ from current prices.
          Final fare is confirmed on the airline/OTA website.
          APIx is not a booking platform — we redirect you to official sites.
        </div>
      </div>
    </>
  )
}

// Helper: convert hex to rgb string for rgba()
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3), 16)
  const g = parseInt(hex.slice(3,5), 16)
  const b = parseInt(hex.slice(5,7), 16)
  return `${r},${g},${b}`
}