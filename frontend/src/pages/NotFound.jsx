// src/pages/NotFound.jsx
import { useNavigate } from "react-router-dom"
import { colors } from "../styles/theme"

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <div style={{ maxWidth:600, margin:"0 auto",
                  padding:"120px 20px", textAlign:"center" }}>
      <div style={{ fontSize:72, marginBottom:16 }}>✈</div>
      <div style={{
        fontSize:80, fontWeight:900, color:colors.textPrimary,
        letterSpacing:"-4px", lineHeight:1,
        background:"linear-gradient(135deg, #3b82f6, #8b5cf6)",
        WebkitBackgroundClip:"text",
        WebkitTextFillColor:"transparent",
        marginBottom:16,
      }}>404</div>
      <div style={{ fontSize:20, fontWeight:700,
                    color:colors.textPrimary, marginBottom:8 }}>
        Flight not found
      </div>
      <div style={{ fontSize:14, color:colors.textSecondary,
                    marginBottom:32, lineHeight:1.7 }}>
        This page doesn't exist. Maybe the route was cancelled
        or you typed the wrong destination.
      </div>
      <div style={{ display:"flex", gap:12,
                    justifyContent:"center", flexWrap:"wrap" }}>
        <button onClick={() => navigate("/")}
          style={{
            background:"linear-gradient(135deg, #3b82f6, #1d4ed8)",
            border:"none", borderRadius:12,
            color:"#fff", padding:"12px 28px",
            fontSize:14, fontWeight:600, cursor:"pointer",
            boxShadow:"0 4px 16px rgba(59,130,246,0.35)",
          }}>
          ← Back to home
        </button>
        <button onClick={() => navigate("/search")}
          style={{
            background:"rgba(255,255,255,0.06)",
            border:"1px solid rgba(255,255,255,0.1)",
            borderRadius:12, color:colors.textSecondary,
            padding:"12px 28px", fontSize:14,
            fontWeight:600, cursor:"pointer",
          }}>
          Search flights
        </button>
      </div>
    </div>
  )
}