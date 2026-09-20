// src/components/Navbar.jsx
import { NavLink, useLocation } from "react-router-dom"
import { useState } from "react"
import { colors, glass, gradients } from "../styles/theme"
import { useEffect } from "react"
import { fetchHealth } from "../api"
import useLiveData from "../hooks/useLiveData"

const links = [
  { to: "/",          label: "Home",      icon: "⌂" },
  { to: "/index",     label: "Index",     icon: "📈" },
  { to: "/routes",    label: "Routes",    icon: "🗺" },
  { to: "/search",    label: "Search",    icon: "🔍" },
  { to: "/analytics", label: "Analytics", icon: "📊" },
  { to: "/backtest",  label: "Back-test", icon: "✅" },
  { to: "/api",       label: "API Docs",  icon: "🔌" },
]

export default function Navbar({ apix }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const [scrapeStatus, setScrapeStatus] = useState(null)
    const { connected: wsOn } = useLiveData()

  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_BACKEND_URL ?? 
            "https://apix-india-api.onrender.com"}/api/live/status`
        )
        const data = await res.json()
        setScrapeStatus(data)
      } catch {
        // Silent fail
      }
    }
    checkStatus()
    const timer = setInterval(checkStatus, 5 * 60 * 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <>
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000,
        ...glass.card,
        borderRadius: 0,
        borderTop: "none",
        borderLeft: "none",
        borderRight: "none",
        padding: "0 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: 64,
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
      }}>

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
            borderRadius: 10, width: 36, height: 36,
            display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 18,
            boxShadow: "0 4px 12px rgba(59,130,246,0.4)"
          }}>✈</div>
          <div>
            <div style={{
              fontSize: 16, fontWeight: 800, letterSpacing: "-0.3px",
              background: "linear-gradient(135deg, #60a5fa, #a78bfa)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>APIx India</div>
            <div style={{ fontSize: 10, color: colors.textMuted,
                          letterSpacing: "0.06em", marginTop: -2 }}>
              AIRFARE PRICE INDEX
            </div>
          </div>
        </div>

        {/* Desktop links */}
        <div className="hide-mobile"
             style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {links.map(link => (
            <NavLink key={link.to} to={link.to}
              style={({ isActive }) => ({
                padding: "6px 14px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                textDecoration: "none",
                color: isActive ? "#fff" : colors.textSecondary,
                background: isActive
                  ? "linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.2))"
                  : "transparent",
                border: isActive
                  ? "1px solid rgba(59,130,246,0.3)"
                  : "1px solid transparent",
                transition: "all 0.15s",
              })}
              end={link.to === "/"}>
              {link.label}
            </NavLink>
          ))}
        </div>

        {/* Live APIx pill */}

                  {/* WS indicator dot */}
          <div
            title={wsOn ? "WebSocket connected" : "Using polling"}
            style={{
              width:8, height:8, borderRadius:"50%",
              background: wsOn ? colors.green : colors.amber,
              boxShadow: wsOn
                ? `0 0 6px ${colors.green}`
                : `0 0 6px ${colors.amber}`,
              animation: wsOn ? "pulse-dot 2s infinite" : "none",
              flexShrink:0,
            }} />


                  {scrapeStatus && (
            <div style={{
              fontSize:10, color: scrapeStatus.status === "fresh"
                ? colors.green : colors.amber,
              display:"flex", alignItems:"center", gap:4,
            }}
            title={`Last scrape: ${scrapeStatus.minutes_ago} min ago`}>
              <span style={{
                width:6, height:6, borderRadius:"50%",
                background: scrapeStatus.status === "fresh"
                  ? colors.green : colors.amber,
                display:"inline-block",
              }} />
              {scrapeStatus.minutes_ago
                ? `${scrapeStatus.minutes_ago}m ago`
                : "live"}
            </div>
          )}


        
        <div style={{
          display: "flex", alignItems: "center", gap: 10
        }}>
          {apix && (
            <div style={{
              background: "rgba(16,185,129,0.1)",
              border: "1px solid rgba(16,185,129,0.25)",
              borderRadius: 999, padding: "6px 14px",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span className="live-dot" />
              <span style={{ fontSize: 12, color: "#10b981",
                             fontWeight: 600 }}>
                APIx {apix?.toFixed(1)}
              </span>
            </div>
          )}


                

          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              display: "none", // shown via media query
              background: "transparent", border: "none",
              color: colors.textPrimary, fontSize: 20,
              cursor: "pointer", padding: 8,
            }}
            className="show-mobile">
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{
          position: "fixed", top: 64, left: 0, right: 0,
          zIndex: 999, ...glass.strong,
          borderRadius: 0, padding: 16,
          display: "flex", flexDirection: "column", gap: 4,
        }}>
          {links.map(link => (
            <NavLink key={link.to} to={link.to}
              onClick={() => setMenuOpen(false)}
              style={({ isActive }) => ({
                padding: "12px 16px", borderRadius: 10,
                fontSize: 14, fontWeight: 500,
                textDecoration: "none",
                color: isActive ? "#fff" : colors.textSecondary,
                background: isActive ? "rgba(59,130,246,0.15)" : "transparent",
                display: "flex", alignItems: "center", gap: 10,
              })}
              end={link.to === "/"}>
              <span>{link.icon}</span>
              {link.label}
            </NavLink>
          ))}
        </div>
      )}

      {/* Spacer */}
      <div style={{ height: 64 }} />
    </>
  )
}