export type EventCategory =
  | "conflict"
  | "natural-disaster"
  | "politics"
  | "economics"
  | "health"
  | "technology"
  | "environment"
  | "social"

export const SEVERITY_LEVELS = ["low", "medium", "high", "critical"] as const
export type SeverityLevel = (typeof SEVERITY_LEVELS)[number]

export interface WorldEvent {
  id: string
  title: string
  description: string
  category: EventCategory
  severity: SeverityLevel
  coordinates: [number, number]
  location: string
  timestamp: string
  source?: string
}

export interface CategoryConfig {
  id: EventCategory
  label: string
  emoji: string
  color: string
  markerColor: string
}
