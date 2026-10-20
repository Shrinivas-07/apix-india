// src/components/PageHeader.jsx
// Consistent page header across all pages
import LiveBadge from "./LiveBadge"
import { colors } from "../styles/theme"

export default function PageHeader({
  title, subtitle, badge = false, badgeLabel, children
}) {
  return (
    <div style={{ marginBottom:32 }}>
      <div style={{ display:"flex", alignItems:"center",
                    gap:12, marginBottom:8,
                    flexWrap:"wrap" }}>
        <h1 style={{
          fontSize:"clamp(22px, 5vw, 28px)",
          fontWeight:800, color:colors.textPrimary,
          letterSpacing:"-0.5px", margin:0,
        }}>
          {title}
        </h1>
        {badge && <LiveBadge label={badgeLabel} />}
      </div>
      {subtitle && (
        <p style={{ fontSize:"clamp(13px, 3vw, 14px)",
                    color:colors.textSecondary,
                    margin:0, lineHeight:1.6 }}>
          {subtitle}
        </p>
      )}
      {children}
    </div>
  )
}