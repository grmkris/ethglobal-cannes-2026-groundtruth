// Single source of truth for event domain enums
// Zero dependencies — safe to import from both server and client

export const EVENT_CATEGORY_VALUES = [
  "conflict",
  "natural-disaster",
  "politics",
  "economics",
  "health",
  "technology",
  "environment",
  "social",
] as const

export const SEVERITY_LEVEL_VALUES = [
  "low",
  "medium",
  "high",
  "critical",
] as const

export type EventCategory = (typeof EVENT_CATEGORY_VALUES)[number]
export type SeverityLevel = (typeof SEVERITY_LEVEL_VALUES)[number]

export const DISPUTE_REASONS = ["inaccurate", "misleading", "fabricated"] as const
export type DisputeReason = (typeof DISPUTE_REASONS)[number]

export const DISPUTE_VALUES: Record<DisputeReason, number> = {
  inaccurate: -1,
  misleading: -2,
  fabricated: -3,
} as const
