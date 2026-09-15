// src/styles/theme.js
// Global design system — glassmorphism dark theme
// Every component imports from here for consistency

export const colors = {
  // Backgrounds
  bg:           "#070d1a",       // deepest dark
  bgSecondary:  "#0d1528",       // slightly lighter
  bgTertiary:   "#111d35",       // card backgrounds

  // Glass effects
  glass:        "rgba(255,255,255,0.04)",
  glassBorder:  "rgba(255,255,255,0.08)",
  glassHover:   "rgba(255,255,255,0.07)",
  glassStrong:  "rgba(255,255,255,0.09)",

  // Accent colors
  blue:         "#3b82f6",
  blueGlow:     "rgba(59,130,246,0.15)",
  blueDark:     "#1d4ed8",
  cyan:         "#06b6d4",
  cyanGlow:     "rgba(6,182,212,0.15)",
  purple:       "#8b5cf6",
  purpleGlow:   "rgba(139,92,246,0.15)",
  green:        "#10b981",
  greenGlow:    "rgba(16,185,129,0.15)",
  red:          "#ef4444",
  redGlow:      "rgba(239,68,68,0.15)",
  amber:        "#f59e0b",
  amberGlow:    "rgba(245,158,11,0.15)",

  // Text
  textPrimary:   "#f0f4ff",
  textSecondary: "#8892a4",
  textMuted:     "#4a5568",
  textAccent:    "#60a5fa",

  // Borders
  border:        "rgba(255,255,255,0.06)",
  borderStrong:  "rgba(255,255,255,0.12)",
}

export const glass = {
  // Standard glass card
  card: {
    background:   colors.glass,
    border:       `1px solid ${colors.glassBorder}`,
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderRadius: 16,
  },
  // Stronger glass for hero elements
  strong: {
    background:   colors.glassStrong,
    border:       `1px solid ${colors.borderStrong}`,
    backdropFilter: "blur(30px)",
    WebkitBackdropFilter: "blur(30px)",
    borderRadius: 20,
  },
  // Subtle glass for inner elements
  subtle: {
    background:   "rgba(255,255,255,0.02)",
    border:       `1px solid ${colors.border}`,
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    borderRadius: 12,
  },
}

export const text = {
  hero:    { fontSize: 52, fontWeight: 800, letterSpacing: "-1.5px", lineHeight: 1.1 },
  h1:      { fontSize: 36, fontWeight: 700, letterSpacing: "-0.8px" },
  h2:      { fontSize: 24, fontWeight: 700, letterSpacing: "-0.5px" },
  h3:      { fontSize: 18, fontWeight: 600, letterSpacing: "-0.3px" },
  h4:      { fontSize: 15, fontWeight: 600 },
  body:    { fontSize: 14, fontWeight: 400, lineHeight: 1.6 },
  small:   { fontSize: 12, fontWeight: 400 },
  tiny:    { fontSize: 11, fontWeight: 400, letterSpacing: "0.03em" },
  label:   { fontSize: 11, fontWeight: 500, textTransform: "uppercase",
             letterSpacing: "0.08em" },
  mono:    { fontSize: 13, fontFamily: "monospace" },
  number:  { fontSize: 32, fontWeight: 700, letterSpacing: "-1px",
             fontVariantNumeric: "tabular-nums" },
  bignum:  { fontSize: 48, fontWeight: 800, letterSpacing: "-2px",
             fontVariantNumeric: "tabular-nums" },
}

export const spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
  section: 80,
}

export const radius = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  28,
  full: 9999,
}

export const shadows = {
  glow: (color) => `0 0 40px ${color}`,
  glowSm: (color) => `0 0 20px ${color}`,
  card: "0 8px 32px rgba(0,0,0,0.4)",
  cardHover: "0 16px 48px rgba(0,0,0,0.5)",
}

// Reusable component styles
export const components = {
  // Glass card with padding
  card: {
    ...glass.card,
    padding: spacing.lg,
    boxShadow: shadows.card,
  },

  // Label above a stat
  statLabel: {
    ...text.label,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },

  // Big number
  statValue: {
    ...text.bignum,
    color: colors.textPrimary,
  },

  // Up indicator
  up: {
    color: colors.green,
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontSize: 13,
    fontWeight: 600,
  },

  // Down indicator
  down: {
    color: colors.red,
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontSize: 13,
    fontWeight: 600,
  },

  // Live badge
  liveBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: "rgba(16,185,129,0.15)",
    border: "1px solid rgba(16,185,129,0.3)",
    color: "#10b981",
    padding: "4px 10px",
    borderRadius: radius.full,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  },

  // Primary button
  btnPrimary: {
    background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
    border: "none",
    borderRadius: radius.md,
    color: "#fff",
    padding: "12px 24px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
    boxShadow: "0 4px 20px rgba(59,130,246,0.3)",
  },

  // Ghost button
  btnGhost: {
    background: colors.glass,
    border: `1px solid ${colors.glassBorder}`,
    borderRadius: radius.md,
    color: colors.textPrimary,
    padding: "10px 20px",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    backdropFilter: "blur(10px)",
    transition: "all 0.2s",
  },

  // Input field
  input: {
    background: "rgba(255,255,255,0.04)",
    border: `1px solid ${colors.glassBorder}`,
    borderRadius: radius.md,
    color: colors.textPrimary,
    padding: "12px 16px",
    fontSize: 14,
    outline: "none",
    width: "100%",
    transition: "border-color 0.2s",
  },
}

// Gradient presets
export const gradients = {
  hero:     "linear-gradient(135deg, #070d1a 0%, #0d1528 50%, #111d35 100%)",
  blue:     "linear-gradient(135deg, #1d4ed8, #3b82f6)",
  cyan:     "linear-gradient(135deg, #0891b2, #06b6d4)",
  green:    "linear-gradient(135deg, #059669, #10b981)",
  red:      "linear-gradient(135deg, #dc2626, #ef4444)",
  purple:   "linear-gradient(135deg, #7c3aed, #8b5cf6)",
  amber:    "linear-gradient(135deg, #d97706, #f59e0b)",
  mesh:     `radial-gradient(ellipse at 20% 50%, rgba(59,130,246,0.08) 0%, transparent 60%),
             radial-gradient(ellipse at 80% 20%, rgba(139,92,246,0.06) 0%, transparent 60%),
             radial-gradient(ellipse at 50% 80%, rgba(6,182,212,0.06) 0%, transparent 60%)`,
}