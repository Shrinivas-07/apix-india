// src/components/AnimatedNumber.jsx
// Smoothly animates a number from old value to new value
// Used for live APIx ticker

import { useEffect, useRef, useState } from "react"

export default function AnimatedNumber({
  value,
  decimals = 1,
  prefix   = "",
  suffix   = "",
  duration = 800,
  style    = {},
}) {
  const [display, setDisplay]   = useState(value)
  const [flashing, setFlashing] = useState(false)
  const prevValue = useRef(value)
  const frameRef  = useRef(null)

  useEffect(() => {
    if (value === prevValue.current) return

    const start    = prevValue.current ?? value
    const end      = value
    const diff     = end - start
    const startTs  = performance.now()

    // Flash green/red briefly when value changes
    setFlashing(true)
    setTimeout(() => setFlashing(false), 600)

    function tick(now) {
      const elapsed  = now - startTs
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased    = 1 - Math.pow(1 - progress, 3)
      const current  = start + diff * eased
      setDisplay(current)

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick)
      } else {
        setDisplay(end)
        prevValue.current = end
      }
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [value, duration])

  const isUp = value > (prevValue.current ?? value)

  return (
    <span style={{
      ...style,
      transition: "color 0.3s ease",
      color: flashing
        ? (isUp ? "#ef4444" : "#10b981")
        : (style.color ?? "inherit"),
      display: "inline-block",
    }}>
      {prefix}{display.toFixed(decimals)}{suffix}
    </span>
  )
}