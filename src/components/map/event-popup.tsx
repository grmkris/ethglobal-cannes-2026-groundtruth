import { getCategoryConfig } from "@/lib/event-categories"
import type { SeverityLevel, WorldEvent } from "@/lib/orpc-types"
import { cn } from "@/lib/utils"
import { MessageCircleIcon } from "lucide-react"

const SEVERITY_STYLES: Record<SeverityLevel, string> = {
  critical: "bg-red-500/10 text-red-500 border-red-500/20",
  high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  low: "bg-green-500/10 text-green-500 border-green-500/20",
}

export function EventPopupContent({
  event,
  onOpenChat,
}: {
  event: WorldEvent
  onOpenChat?: (eventId: string) => void
}) {
  const config = getCategoryConfig(event.category)
  const time = new Date(event.timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <div className="w-64">
      <div className="mb-2 flex items-center gap-1.5">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
            config.color
          )}
        >
          {config.emoji} {config.label}
        </span>
        <span
          className={cn(
            "inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-medium uppercase",
            SEVERITY_STYLES[event.severity]
          )}
        >
          {event.severity}
        </span>
      </div>
      <h3 className="mb-1 text-sm font-semibold leading-tight">
        {event.title}
      </h3>
      <p className="mb-2 text-xs leading-relaxed text-muted-foreground">
        {event.description}
      </p>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{event.location}</span>
        <span>{time}</span>
      </div>
      {event.source && (
        <div className="mt-1 text-[10px] text-muted-foreground/60">
          via {event.source}
        </div>
      )}
      {onOpenChat && (
        <button
          onClick={() => onOpenChat(event.id)}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border bg-muted/50 px-2 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
        >
          <MessageCircleIcon size={12} />
          Open Chat
        </button>
      )}
    </div>
  )
}
