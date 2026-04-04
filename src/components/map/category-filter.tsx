"use client"

import { EVENT_CATEGORIES } from "@/lib/event-categories"
import type { EventCategory } from "@/lib/orpc-types"
import { cn } from "@/lib/utils"

export function CategoryFilter({
  activeCategories,
  onToggle,
}: {
  activeCategories: Set<EventCategory>
  onToggle: (category: EventCategory) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {EVENT_CATEGORIES.map((cat) => {
        const isActive = activeCategories.has(cat.id)
        return (
          <button
            key={cat.id}
            onClick={() => onToggle(cat.id)}
            aria-pressed={isActive}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium transition-all",
              isActive
                ? cat.color
                : "border-border text-muted-foreground opacity-40"
            )}
          >
            <span>{cat.emoji}</span>
            <span>{cat.label}</span>
          </button>
        )
      })}
    </div>
  )
}
