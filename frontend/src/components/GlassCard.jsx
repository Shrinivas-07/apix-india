// src/components/GlassCard.jsx
import { glass, shadows } from "../styles/theme"

export default function GlassCard({
  children, padding = 24, radius = 16,
  glow, style = {}, className = "", onClick
}) {
  return (
    <div
      className={`glass-card ${className}`}
      onClick={onClick}
      style={{
        ...glass.card,
        padding,
        borderRadius: radius,
        boxShadow: glow
          ? `${shadows.card}, 0 0 40px ${glow}`
          : shadows.card,
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}>
      {children}
    </div>
  )
}