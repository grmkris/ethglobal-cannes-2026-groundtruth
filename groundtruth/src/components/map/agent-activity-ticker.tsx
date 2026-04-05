"use client"

import { useAgentActivity } from "@/hooks/use-agent-activity"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import type { WorldEventId } from "@/lib/typeid"
import {
  AlertTriangleIcon,
  BotIcon,
  CheckCircleIcon,
  MessageSquareIcon,
  RadioIcon,
} from "lucide-react"

const ACTION_CONFIG = {
  report: { icon: RadioIcon, label: "reported", color: "text-violet-500" },
  corroborate: { icon: CheckCircleIcon, label: "corroborated", color: "text-blue-500" },
  chat: { icon: MessageSquareIcon, label: "commented on", color: "text-muted-foreground" },
  dispute: { icon: AlertTriangleIcon, label: "disputed", color: "text-red-500" },
} as const

function timeAgo(timestamp: string): string {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

function TickerItem({
  activity,
  onSelect,
}: {
  activity: {
    id: string
    type: "report" | "corroborate" | "chat" | "dispute"
    agentEnsName: string | null
    agentAddress: string
    eventTitle: string | null
    eventId: string | null
    timestamp: string
  }
  onSelect?: (eventId: WorldEventId) => void
}) {
  const config = ACTION_CONFIG[activity.type]
  const Icon = config.icon
  const agentLabel = activity.agentEnsName ?? `${activity.agentAddress.slice(0, 6)}...${activity.agentAddress.slice(-4)}`

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            className="inline-flex shrink-0 items-center gap-1.5 px-3 text-[10px] transition-colors hover:text-foreground"
            onClick={() => {
              if (activity.eventId && onSelect) {
                onSelect(activity.eventId as WorldEventId)
              }
            }}
          />
        }
      >
        <BotIcon size={10} className="shrink-0 text-violet-500" />
        <span className="font-medium">{agentLabel}</span>
        <Icon size={9} className={config.color} />
        <span className="text-muted-foreground">{config.label}</span>
        {activity.eventTitle && (
          <span className="max-w-[140px] truncate font-medium">
            {activity.eventTitle}
          </span>
        )}
        <span className="text-muted-foreground/60">{timeAgo(activity.timestamp)}</span>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {agentLabel} {config.label} {activity.eventTitle ?? "an event"}
      </TooltipContent>
    </Tooltip>
  )
}

export function AgentActivityTicker({
  onSelectEvent,
}: {
  onSelectEvent?: (eventId: WorldEventId) => void
}) {
  const { data: activities } = useAgentActivity()

  if (!activities || activities.length === 0) return null

  return (
    <div className="w-full shrink-0 border-b bg-background/90 backdrop-blur-md overflow-hidden">
      <div
        className="flex w-max items-center gap-1 py-1.5 hover:[animation-play-state:paused]"
        style={{ animation: "marquee 30s linear infinite" }}
      >
        {activities.map((a) => (
          <TickerItem key={a.id} activity={a} onSelect={onSelectEvent} />
        ))}
        {activities.map((a) => (
          <TickerItem key={`dup-${a.id}`} activity={a} onSelect={onSelectEvent} />
        ))}
      </div>
    </div>
  )
}
