"use client"

import { useState } from "react"
import { ChevronRightIcon, MapPinIcon, ExternalLinkIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatRelativeTime } from "@/lib/feeds/geo"
import { useFindRelated } from "@/hooks/feeds/use-find-related"
import type { WorldEvent } from "@/lib/orpc-types"
import type { RelatedItem } from "@/lib/feeds/types"

/**
 * Collapsed-by-default section that surfaces overlay items (quakes, fires,
 * hazards, storms, volcanoes) near a selected event. Only renders when at
 * least one active overlay layer has nearby matches.
 */
export function RelatedContext({
  event,
  onShowOnMap,
}: {
  event: WorldEvent
  onShowOnMap?: (coords: [number, number]) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const { groups, totalCount } = useFindRelated(event)

  if (totalCount === 0) return null

  return (
    <div className="rounded-md border border-emerald-500/10 bg-emerald-500/[0.03] px-2 py-1.5">
      <button
        type="button"
        onClick={() => setExpanded((x) => !x)}
        className="flex w-full items-center gap-1.5 text-left"
      >
        <ChevronRightIcon
          size={10}
          className={cn(
            "shrink-0 text-muted-foreground transition-transform",
            expanded && "rotate-90"
          )}
        />
        <span className="text-[10px] font-medium">Related context</span>
        <span className="text-[10px] text-muted-foreground">
          · {totalCount} nearby item{totalCount !== 1 ? "s" : ""}
        </span>
      </button>

      {expanded && (
        <div className="mt-2 space-y-2">
          {groups.map((group) => (
            <div key={group.id}>
              <div className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground/70">
                {group.label}
              </div>
              <div className="mt-0.5 space-y-0.5">
                {group.items.slice(0, 5).map((item) => (
                  <RelatedRow
                    key={item.id}
                    item={item}
                    onShowOnMap={onShowOnMap}
                  />
                ))}
                {group.items.length > 5 && (
                  <div className="px-1 text-[9px] text-muted-foreground/60">
                    +{group.items.length - 5} more
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function RelatedRow({
  item,
  onShowOnMap,
}: {
  item: RelatedItem
  onShowOnMap?: (coords: [number, number]) => void
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onShowOnMap?.([item.lat, item.lng])}
        className="flex min-w-0 flex-1 items-center gap-1.5 rounded px-1 py-0.5 text-left hover:bg-muted/50"
      >
        <MapPinIcon
          size={8}
          className="shrink-0 text-muted-foreground/60"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[10px]">{item.title}</div>
        </div>
        <div className="shrink-0 text-[9px] text-muted-foreground/60 tabular-nums">
          {item.distanceKm.toFixed(0)}km · {formatRelativeTime(item.timestamp)}
        </div>
      </button>
      {item.url && (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded p-0.5 text-muted-foreground/60 hover:text-foreground"
          aria-label="Open source"
        >
          <ExternalLinkIcon size={9} />
        </a>
      )}
    </div>
  )
}
