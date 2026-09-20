// src/components/FareRangeChart.jsx
// Custom candlestick-style chart showing fare min/max/avg per advance window
// Built with Recharts ComposedChart + custom shapes

import {
  ComposedChart, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
  ErrorBar, Scatter, Line
} from "recharts"
import { colors, glass } from "../styles/theme"

// ── Custom candlestick shape ──────────────────────────────────────────────────
function CandleShape(props) {
  const { x, y, width, height, payload } = props
  if (!payload) return null

  const { min_fare, max_fare, avg_fare } = payload
  if (!min_fare || !max_fare) return null

  // Scale values to chart coordinates
  const { yAxis } = props
  if (!yAxis) return null

  const yMin = yAxis.scale(min_fare)
  const yMax = yAxis.scale(max_fare)
  const yAvg = yAxis.scale(avg_fare)
  const cx   = x + width / 2

  const isHigh = avg_fare > 4000
  const color  = isHigh ? colors.red : colors.green

  return (
    <g>
      {/* Vertical line from min to max */}
      <line x1={cx} y1={yMax} x2={cx} y2={yMin}
            stroke={color} strokeWidth={2} opacity={0.6} />

      {/* Min tick */}
      <line x1={cx-6} y1={yMin} x2={cx+6} y2={yMin}
            stroke={color} strokeWidth={2} />

      {/* Max tick */}
      <line x1={cx-6} y1={yMax} x2={cx+6} y2={yMax}
            stroke={color} strokeWidth={2} />

      {/* Avg dot */}
      <circle cx={cx} cy={yAvg} r={5}
              fill={color}
              stroke="#0d1528" strokeWidth={2} />
    </g>
  )
}

// ── Custom tooltip ────────────────────────────────────────────────────────────
function RangeTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null

  const saving = d.avg_fare && payload[0]?.payload
    ? null : null

  return (
    <div style={{
      ...glass.strong, padding:"14px 18px",
      borderRadius:12, minWidth:180,
    }}>
      <div style={{ fontSize:12, color:colors.textMuted,
                    marginBottom:8 }}>
        T+{label} days advance
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        {[
          { label:"Max fare", value:d.max_fare, color:colors.red    },
          { label:"Avg fare", value:d.avg_fare, color:colors.blue   },
          { label:"Min fare", value:d.min_fare, color:colors.green  },
          { label:"Samples",  value:d.sample_count, color:colors.textMuted, noRs:true },
        ].map(item => (
          <div key={item.label}
               style={{ display:"flex", justifyContent:"space-between",
                        gap:16 }}>
            <span style={{ fontSize:12, color:colors.textSecondary }}>
              {item.label}
            </span>
            <span style={{ fontSize:13, fontWeight:600,
                           color:item.color }}>
              {item.noRs ? item.value : `₹${item.value?.toLocaleString("en-IN")}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function FareRangeChart({ data = [], height = 280 }) {
  if (!data.length) return (
    <div style={{ height, display:"flex", alignItems:"center",
                  justifyContent:"center", color:colors.textMuted }}>
      No range data available
    </div>
  )

  // Recharts doesn't natively support candlesticks
  // We use a scatter plot with custom shape + line for avg
  const chartData = data.map(d => ({
    ...d,
    // For error bar: [below avg, above avg]
    errorBar: [
      d.avg_fare - d.min_fare,
      d.max_fare - d.avg_fare,
    ],
  }))

  const allVals = data.flatMap(d => [d.min_fare, d.max_fare])
  const yMin    = Math.min(...allVals) * 0.95
  const yMax    = Math.max(...allVals) * 1.05

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={chartData}
        margin={{ top:10, right:10, left:-10, bottom:0 }}>
        <CartesianGrid strokeDasharray="3 3"
                       stroke="rgba(255,255,255,0.04)" />
        <XAxis dataKey="advance_days"
               tickFormatter={v => `T+${v}`}
               tick={{ fontSize:11, fill:colors.textMuted }}
               axisLine={false} tickLine={false} />
        <YAxis domain={[yMin, yMax]}
               tick={{ fontSize:10, fill:colors.textMuted }}
               tickFormatter={v => `₹${(v/1000).toFixed(1)}k`}
               axisLine={false} tickLine={false} />
        <Tooltip content={<RangeTooltip />} />

        {/* Shaded range band */}
        <defs>
          <linearGradient id="rangeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={colors.red}   stopOpacity={0.15}/>
            <stop offset="100%" stopColor={colors.green} stopOpacity={0.15}/>
          </linearGradient>
        </defs>

        {/* Average line */}
        <Line type="monotone" dataKey="avg_fare"
              stroke={colors.blue} strokeWidth={2.5}
              dot={{ r:5, fill:colors.blue,
                     stroke:"#0d1528", strokeWidth:2 }}
              name="Avg fare" />

        {/* Min line */}
        <Line type="monotone" dataKey="min_fare"
              stroke={colors.green} strokeWidth={1.5}
              strokeDasharray="4 4" dot={false}
              name="Min fare" />

        {/* Max line */}
        <Line type="monotone" dataKey="max_fare"
              stroke={colors.red} strokeWidth={1.5}
              strokeDasharray="4 4" dot={false}
              name="Max fare" />
      </ComposedChart>
    </ResponsiveContainer>
  )
}