import { getCategoryConfig } from "@/lib/event-categories"
import type { SeverityLevel, WorldEvent } from "@/lib/orpc-types"
import type { WorldEventId } from "@/lib/typeid"
import { cn } from "@/lib/utils"
import { BadgeCheckIcon, BotIcon, MessageCircleIcon } from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

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
  onOpenChat?: (eventId: WorldEventId) => void
}) {
  const config = getCategoryConfig(event.category)
  const time = new Date(event.timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <Card size="sm" className="w-[min(18rem,calc(100vw-4rem))] gap-0 py-0 shadow-xl">
      <CardHeader className="px-3 pt-3 pb-2">
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className={cn("text-[10px]", config.color)}>
            {config.emoji} {config.label}
          </Badge>
          <Badge variant="outline" className={cn("text-[10px] uppercase", SEVERITY_STYLES[event.severity])}>
            {event.severity}
          </Badge>
          {event.worldIdVerified && (
            <Badge variant="outline" className="gap-0.5 text-[10px] text-emerald-500 border-emerald-500/20 bg-emerald-500/10">
              <BadgeCheckIcon size={10} />
              Verified
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 px-3 pb-2">
        {event.imageUrls.length > 0 && (
          <img
            src={event.imageUrls[0]}
            alt={event.title}
            className="h-28 w-full rounded-md object-cover"
          />
        )}
        <h3 className="text-sm font-semibold leading-tight">{event.title}</h3>
        <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">
          {event.description}
        </p>
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-2 px-3 pb-3 pt-0">
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span className="truncate font-medium">{event.creatorName}</span>
          {event.agentAddress && (
            <Badge variant="outline" className="gap-0.5 text-[9px] px-1 py-0 text-violet-500 border-violet-500/20 bg-violet-500/10">
              <BotIcon size={8} />
              {event.agentEnsName ?? `${event.agentAddress.slice(0, 6)}...${event.agentAddress.slice(-4)}`}
              {event.onChainVerified && <BadgeCheckIcon size={8} className="text-emerald-500" />}
            </Badge>
          )}
        </div>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{event.location}</span>
          <span>{time}</span>
        </div>
        {event.source && (
          <div className="text-[10px] text-muted-foreground/60">
            via{" "}
            {(() => {
              try {
                const domain = new URL(event.source).hostname.replace(/^www\./, "")
                return (
                  <a href={event.source} target="_blank" rel="noopener noreferrer" className="underline decoration-muted-foreground/30 hover:decoration-muted-foreground/60 hover:text-muted-foreground">
                    {domain}
                  </a>
                )
              } catch {
                return <span>{event.source}</span>
              }
            })()}
          </div>
        )}
        {onOpenChat && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => onOpenChat(event.id)}
          >
            <MessageCircleIcon size={12} />
            Open Chat
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
