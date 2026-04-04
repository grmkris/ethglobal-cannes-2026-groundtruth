import { getCategoryConfig } from "@/lib/event-categories"
import type { EventCategory, SeverityLevel } from "@/lib/types"
import { cn } from "@/lib/utils"

export function EventMarkerIcon({
  category,
  severity,
}: {
  category: EventCategory
  severity: SeverityLevel
}) {
  const config = getCategoryConfig(category)

  return (
    <div className="relative flex items-center justify-center">
      {severity === "critical" && (
        <span
          className="absolute size-8 animate-ping rounded-full opacity-40"
          style={{ backgroundColor: config.markerColor }}
        />
      )}
      <div
        className={cn(
          "flex size-8 items-center justify-center rounded-full border-2 border-white text-sm shadow-lg dark:border-neutral-800",
          severity === "high" && "ring-2 ring-offset-1",
        )}
        style={{
          backgroundColor: config.markerColor,
          "--tw-ring-color": config.markerColor,
        } as React.CSSProperties}
      >
        {config.emoji}
      </div>
    </div>
  )
}
