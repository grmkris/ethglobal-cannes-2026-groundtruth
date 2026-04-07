"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { formatRelativeTime } from "@/lib/feeds/geo"
import type { LayerStatus } from "@/lib/feeds/types"

const STATUS_STYLES: Record<LayerStatus, { dot: string; ring?: string; label: string }> = {
  loading: {
    dot: "bg-muted-foreground/50",
    label: "Loading",
  },
  live: {
    dot: "bg-emerald-500",
    ring: "ring-2 ring-emerald-500/30 animate-pulse",
    label: "Live",
  },
  stale: {
    dot: "bg-amber-500",
    label: "Stale",
  },
  down: {
    dot: "bg-red-500",
    label: "Down",
  },
}

/**
 * Compact freshness indicator for an overlay layer row.
 * Renders a colored dot + relative time. Refreshes its own clock once per
 * second so "47s ago" stays accurate without forcing a parent re-render.
 */
export function LayerStatusPill({
  status,
  lastFetched,
  itemCount,
  className,
}: {
  status: LayerStatus
  lastFetched: Date | null
  itemCount?: number
  className?: string
}) {
  // Tick once per second so the relative time string stays current
  // without forcing the parent layer hook to re-render.
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1_000)
    return () => clearInterval(id)
  }, [])

  const styles = STATUS_STYLES[status]
  const showRelative = status !== "loading" && lastFetched
  const showCount = itemCount != null && status === "live"

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 text-[10px] tabular-nums text-muted-foreground",
        className
      )}
      title={
        status === "down"
          ? "Feed unreachable"
          : showRelative
            ? `Updated ${formatRelativeTime(lastFetched)}`
            : styles.label
      }
    >
      <span
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          styles.dot,
          status === "live" && styles.ring
        )}
        aria-hidden
      />
      {showRelative ? (
        <span>{formatRelativeTime(lastFetched)}</span>
      ) : (
        <span>{styles.label}</span>
      )}
      {showCount ? (
        <>
          <span className="text-muted-foreground/40">·</span>
          <span>{itemCount}</span>
        </>
      ) : null}
    </div>
  )
}
