// src/components/StatCard.jsx
import GlassCard from "./GlassCard"
import Skeleton from "./Skeleton"
import { colors, text } from "../styles/theme"

export default function StatCard({
  label, value, sub, subUp, accentColor = colors.blue,
  loading, icon, glow, style = {}
}) {
  return (
    <GlassCard
      glow={glow}
      style={{
        borderTop: `2px solid ${accentColor}`,
        flex: 1, minWidth: 160, ...style
      }}>
      <div style={{
        fontSize: 11, fontWeight: 500, color: colors.textSecondary,
        textTransform: "uppercase", letterSpacing: "0.08em",
        marginBottom: 8, display: "flex",
        alignItems: "center", gap: 6
      }}>
        {icon && <span>{icon}</span>}
        {label}
      </div>

      {loading ? (
        <Skeleton h={40} radius={6} />
      ) : (
        <div style={{
          fontSize: 32, fontWeight: 800, color: colors.textPrimary,
          letterSpacing: "-1px", fontVariantNumeric: "tabular-nums",
          lineHeight: 1.1
        }}>
          {value}
        </div>
      )}

      {sub && !loading && (
        <div style={{
          fontSize: 12, marginTop: 6,
          color: subUp === true  ? "#10b981"
               : subUp === false ? "#ef4444"
               : colors.textSecondary,
          fontWeight: subUp !== undefined ? 500 : 400,
          display: "flex", alignItems: "center", gap: 4
        }}>
          {subUp === true  && "▲ "}
          {subUp === false && "▼ "}
          {sub}
        </div>
      )}
    </GlassCard>
  )
}