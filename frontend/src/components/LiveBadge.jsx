// src/components/LiveBadge.jsx
import { components } from "../styles/theme"

export default function LiveBadge({ label = "LIVE" }) {
  return (
    <div style={components.liveBadge}>
      <span className="live-dot" />
      {label}
    </div>
  )
}