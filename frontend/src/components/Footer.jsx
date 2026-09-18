// src/components/Footer.jsx
import { Link } from "react-router-dom"
import { colors, glass } from "../styles/theme"

const LINKS = {
  "Platform": [
    { label:"Home",        to:"/"          },
    { label:"Index",       to:"/index"     },
    { label:"All Routes",  to:"/routes"    },
    { label:"Search",      to:"/search"    },
  ],
  "Analytics": [
    { label:"Analytics",   to:"/analytics" },
    { label:"Back-test",   to:"/backtest"  },
    { label:"API Docs",    to:"/api"       },
  ],
  "Data": [
    { label:"DGCA Stats",  to:"https://dgca.gov.in", external:true },
    { label:"MoSPI",       to:"https://mospi.gov.in", external:true },
    { label:"RBI",         to:"https://rbi.org.in", external:true },
  ],
}

export default function Footer() {
  return (
    <footer style={{
      ...glass.card,
      borderRadius:0,
      borderBottom:"none",
      borderLeft:"none",
      borderRight:"none",
      marginTop:80,
      padding:"48px 32px 32px",
    }}>
      <div style={{ maxWidth:1200, margin:"0 auto" }}>

        {/* Top row */}
        <div style={{ display:"grid",
                      gridTemplateColumns:"2fr repeat(3, 1fr)",
                      gap:40, marginBottom:40,
                      flexWrap:"wrap" }}>

          {/* Brand */}
          <div>
            <div style={{ display:"flex", alignItems:"center",
                          gap:12, marginBottom:16 }}>
              <div style={{
                background:"linear-gradient(135deg, #3b82f6, #8b5cf6)",
                borderRadius:10, width:40, height:40,
                display:"flex", alignItems:"center",
                justifyContent:"center", fontSize:20,
                boxShadow:"0 4px 12px rgba(59,130,246,0.4)",
              }}>✈</div>
              <div>
                <div style={{
                  fontSize:18, fontWeight:800,
                  background:"linear-gradient(135deg, #60a5fa, #a78bfa)",
                  WebkitBackgroundClip:"text",
                  WebkitTextFillColor:"transparent",
                }}>APIx India</div>
                <div style={{ fontSize:10, color:colors.textMuted,
                              letterSpacing:"0.08em" }}>
                  AIRFARE PRICE INDEX
                </div>
              </div>
            </div>
            <p style={{ fontSize:13, color:colors.textSecondary,
                        lineHeight:1.8, maxWidth:280 }}>
              Real-time domestic airfare price index for India.
              Built for MoSPI · NSO · RBI under Smart India
              Hackathon 2026 (SIH26056).
            </p>

            {/* Live status */}
            <div style={{ marginTop:16, display:"flex",
                          alignItems:"center", gap:8 }}>
              <span className="live-dot" />
              <span style={{ fontSize:12, color:colors.green }}>
                Live · Updates nightly
              </span>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(LINKS).map(([section, links]) => (
            <div key={section}>
              <div style={{ fontSize:11, fontWeight:600,
                            color:colors.textMuted,
                            textTransform:"uppercase",
                            letterSpacing:"0.09em",
                            marginBottom:16 }}>
                {section}
              </div>
              <div style={{ display:"flex",
                            flexDirection:"column", gap:10 }}>
                {links.map(link => (
                  link.external ? (
                    <a key={link.label}
                      href={link.to} target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize:13, color:colors.textSecondary,
                               textDecoration:"none",
                               transition:"color 0.15s" }}
                      onMouseEnter={e =>
                        e.target.style.color = colors.textPrimary}
                      onMouseLeave={e =>
                        e.target.style.color = colors.textSecondary}>
                      {link.label} ↗
                    </a>
                  ) : (
                    <Link key={link.label} to={link.to}
                      style={{ fontSize:13, color:colors.textSecondary,
                               textDecoration:"none",
                               transition:"color 0.15s" }}
                      onMouseEnter={e =>
                        e.target.style.color = colors.textPrimary}
                      onMouseLeave={e =>
                        e.target.style.color = colors.textSecondary}>
                      {link.label}
                    </Link>
                  )
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div style={{ height:1, background:colors.border,
                      marginBottom:24 }} />

        {/* Bottom row */}
        <div style={{ display:"flex", justifyContent:"space-between",
                      alignItems:"center", flexWrap:"wrap", gap:12 }}>
          <div style={{ fontSize:12, color:colors.textMuted }}>
            © 2026 APIx India · SIH26056 · MoSPI
          </div>
          <div style={{ display:"flex", gap:20, flexWrap:"wrap" }}>
            {[
              "Data: Google Flights",
              "Storage: Supabase",
              "API: FastAPI/Render",
              "Dashboard: React/Vercel",
            ].map(item => (
              <span key={item} style={{ fontSize:11,
                                        color:colors.textMuted }}>
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}