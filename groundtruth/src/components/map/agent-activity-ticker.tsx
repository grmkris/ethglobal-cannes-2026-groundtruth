"use client"

import { useAgentActivity } from "@/hooks/use-agent-activity"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import type { WorldEventId } from "@/lib/typeid"
import { cn } from "@/lib/utils"
import {
  AlertTriangleIcon,
  BotIcon,
  CheckCircleIcon,
  MessageSquareIcon,
  RadioIcon,
} from "lucide-react"

// Deterministic color from agent address — 8 distinguishable hues
const AGENT_HUES = [
  { text: "text-violet-400", dot: "bg-violet-400" },
  { text: "text-cyan-400", dot: "bg-cyan-400" },
  { text: "text-rose-400", dot: "bg-rose-400" },
  { text: "text-amber-400", dot: "bg-amber-400" },
  { text: "text-emerald-400", dot: "bg-emerald-400" },
  { text: "text-sky-400", dot: "bg-sky-400" },
  { text: "text-fuchsia-400", dot: "bg-fuchsia-400" },
  { text: "text-lime-400", dot: "bg-lime-400" },
] as const

function agentColor(address: string) {
  let hash = 0
  for (let i = 0; i < address.length; i++) {
    hash = ((hash << 5) - hash + address.charCodeAt(i)) | 0
  }
  return AGENT_HUES[Math.abs(hash) % AGENT_HUES.length]
}

const ACTION_CONFIG = {
  report: {
    icon: RadioIcon,
    label: "reported",
    bg: "bg-violet-500/8 dark:bg-violet-500/10",
    border: "border-violet-500/20",
    iconColor: "text-violet-500",
    glow: "shadow-[inset_0_0_12px_-4px_rgba(139,92,246,0.15)]",
  },
  corroborate: {
    icon: CheckCircleIcon,
    label: "corroborated",
    bg: "bg-blue-500/8 dark:bg-blue-500/10",
    border: "border-blue-500/20",
    iconColor: "text-blue-500",
    glow: "shadow-[inset_0_0_12px_-4px_rgba(59,130,246,0.15)]",
  },
  chat: {
    icon: MessageSquareIcon,
    label: "commented on",
    bg: "bg-amber-500/8 dark:bg-amber-500/10",
    border: "border-amber-500/20",
    iconColor: "text-amber-500",
    glow: "shadow-[inset_0_0_12px_-4px_rgba(245,158,11,0.15)]",
  },
  dispute: {
    icon: AlertTriangleIcon,
    label: "disputed",
    bg: "bg-red-500/8 dark:bg-red-500/10",
    border: "border-red-500/20",
    iconColor: "text-red-500",
    glow: "shadow-[inset_0_0_12px_-4px_rgba(239,68,68,0.15)]",
  },
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
  const agent = agentColor(activity.agentAddress)
  const agentLabel = activity.agentEnsName ?? `${activity.agentAddress.slice(0, 6)}...${activity.agentAddress.slice(-4)}`

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1 text-[10px] transition-all",
              "hover:brightness-110 hover:scale-[1.02]",
              config.bg,
              config.border,
              config.glow,
            )}
            onClick={() => {
              if (activity.eventId && onSelect) {
                onSelect(activity.eventId as WorldEventId)
              }
            }}
          />
        }
      >
        <span className={cn("size-1.5 rounded-full shrink-0", agent.dot)} />
        <span className={cn("font-medium", agent.text)}>{agentLabel}</span>
        <Icon size={9} className={config.iconColor} />
        <span className="text-muted-foreground">{config.label}</span>
        {activity.eventTitle && (
          <span className="max-w-[140px] truncate font-medium">
            {activity.eventTitle}
          </span>
        )}
        <span className="tabular-nums text-muted-foreground/50">{timeAgo(activity.timestamp)}</span>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {agentLabel} {config.label} {activity.eventTitle ?? "an event"}
      </TooltipContent>
    </Tooltip>
  )
}

export function AgentActivityTicker({
  onSelectEvent,
  children,
}: {
  onSelectEvent?: (eventId: WorldEventId) => void
  children?: React.ReactNode
}) {
  const { data: activities } = useAgentActivity()

  return (
    <div className="flex w-full shrink-0 items-center border-b bg-background/90 backdrop-blur-md">
      <div
        className="min-w-0 flex-1 overflow-hidden"
        style={{
          maskImage: "linear-gradient(to right, transparent, black 2%, black 98%, transparent)",
          WebkitMaskImage: "linear-gradient(to right, transparent, black 2%, black 98%, transparent)",
        }}
      >
        {activities && activities.length > 0 ? (
          <div
            className="flex w-max items-center gap-2 px-4 py-1.5 hover:[animation-play-state:paused]"
            style={{ animation: "marquee 90s linear infinite" }}
          >
            {activities.map((a) => (
              <TickerItem key={a.id} activity={a} onSelect={onSelectEvent} />
            ))}
            {activities.map((a) => (
              <TickerItem key={`dup-${a.id}`} activity={a} onSelect={onSelectEvent} />
            ))}
          </div>
        ) : (
          <div className="px-4 py-1.5 text-[10px] text-muted-foreground/50">
            No agent activity yet
          </div>
        )}
      </div>
      {children && (
        <div className="shrink-0 px-2">
          {children}
        </div>
      )}
    </div>
  )
}
