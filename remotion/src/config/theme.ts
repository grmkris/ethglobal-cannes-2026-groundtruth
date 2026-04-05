export const COLORS = {
  bg: "#0a0a0a",
  bgLight: "#111111",
  bgCard: "#161616",
  border: "#2a2a2a",

  // Primary accent
  emerald: "#10b981",
  emeraldDim: "rgba(16, 185, 129, 0.15)",

  // Text
  white: "#ffffff",
  gray: "#a1a1aa",
  muted: "#71717a",

  // Sponsor colors
  worldId: "#7c3aed", // purple
  ens: "#4ec9b0", // teal
  erc8004: "#3b82f6", // blue
  arc: "#10b981", // green/emerald
  mcp: "#94a3b8", // slate

  // Category colors
  conflict: "#ef4444",
  disaster: "#f97316",
  politics: "#a855f7",
  economics: "#10b981",
  health: "#ec4899",
  technology: "#3b82f6",
  environment: "#22c55e",
  social: "#eab308",

  // Severity
  low: "#94a3b8",
  medium: "#eab308",
  high: "#f97316",
  critical: "#ef4444",
} as const;

export const FONTS = {
  mono: "'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, Consolas, monospace",
  sans: "Inter, system-ui, -apple-system, sans-serif",
} as const;

export const VIDEO = {
  width: 1920,
  height: 1080,
  fps: 30,
} as const;
