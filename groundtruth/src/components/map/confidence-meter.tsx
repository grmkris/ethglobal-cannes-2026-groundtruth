"use client"

import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import type { ConfidenceLevel } from "@/lib/confidence"
import { cn } from "@/lib/utils"
import { ShieldCheckIcon } from "lucide-react"

const LEVEL_CONFIG: Record<ConfidenceLevel, { label: string; color: string; bar: string }> = {
  unverified: { label: "Unverified", color: "text-muted-foreground", bar: "bg-muted-foreground/50" },
  low: { label: "Low", color: "text-red-500", bar: "bg-red-500" },
  medium: { label: "Medium", color: "text-yellow-500", bar: "bg-yellow-500" },
  high: { label: "High", color: "text-green-500", bar: "bg-green-500" },
  verified: { label: "Verified", color: "text-emerald-500", bar: "bg-emerald-500" },
}

export function ConfidenceMeter({
  score,
  level,
  compact,
}: {
  score: number
  level: ConfidenceLevel
  compact?: boolean
}) {
  const config = LEVEL_CONFIG[level]

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <span className={cn("inline-block size-2 rounded-full shrink-0", config.bar)} />
          }
        />
        <TooltipContent side="right">
          Confidence: {score}% ({config.label})
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <ShieldCheckIcon size={10} className={config.color} />
              <span className={cn("text-[10px] font-medium", config.color)}>
                {score}% {config.label}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full transition-all duration-700 ease-out", config.bar)}
                style={{ width: `${score}%` }}
              />
            </div>
          </div>
        }
      />
      <TooltipContent side="bottom" className="text-[10px]">
        Confidence score based on corroborations, verification status, and disputes
      </TooltipContent>
    </Tooltip>
  )
}
