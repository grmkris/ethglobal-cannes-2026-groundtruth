import type { EventCategory } from "@/lib/event-constants"

export interface CategoryConfig {
  id: EventCategory
  label: string
  emoji: string
  color: string
  markerColor: string
}

export const EVENT_CATEGORIES: CategoryConfig[] = [
  {
    id: "conflict",
    label: "Conflict",
    emoji: "⚔️",
    color: "text-red-500 bg-red-500/10 border-red-500/20",
    markerColor: "#ef4444",
  },
  {
    id: "natural-disaster",
    label: "Disaster",
    emoji: "🌊",
    color: "text-orange-500 bg-orange-500/10 border-orange-500/20",
    markerColor: "#f97316",
  },
  {
    id: "politics",
    label: "Politics",
    emoji: "🏛️",
    color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
    markerColor: "#a855f7",
  },
  {
    id: "economics",
    label: "Economics",
    emoji: "📈",
    color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    markerColor: "#10b981",
  },
  {
    id: "health",
    label: "Health",
    emoji: "🏥",
    color: "text-pink-500 bg-pink-500/10 border-pink-500/20",
    markerColor: "#ec4899",
  },
  {
    id: "technology",
    label: "Technology",
    emoji: "💻",
    color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    markerColor: "#3b82f6",
  },
  {
    id: "environment",
    label: "Environment",
    emoji: "🌍",
    color: "text-green-500 bg-green-500/10 border-green-500/20",
    markerColor: "#22c55e",
  },
  {
    id: "social",
    label: "Social",
    emoji: "✊",
    color: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20",
    markerColor: "#eab308",
  },
]

export const CATEGORY_MAP = new Map<EventCategory, CategoryConfig>(
  EVENT_CATEGORIES.map((c) => [c.id, c])
)

const FALLBACK_CONFIG: CategoryConfig = {
  id: "social" as EventCategory,
  label: "Unknown",
  emoji: "❓",
  color: "text-muted-foreground bg-muted/10 border-border",
  markerColor: "#6b7280",
}

export function getCategoryConfig(id: EventCategory): CategoryConfig {
  return CATEGORY_MAP.get(id) ?? FALLBACK_CONFIG
}
