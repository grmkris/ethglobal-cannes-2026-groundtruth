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
