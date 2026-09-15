// src/components/Skeleton.jsx
export default function Skeleton({ w = "100%", h = 20, radius = 8 }) {
  return (
    <div className="shimmer" style={{
      width: w, height: h, borderRadius: radius,
    }} />
  )
}