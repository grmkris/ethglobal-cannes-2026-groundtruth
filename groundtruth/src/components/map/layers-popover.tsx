"use client"

import { LayersIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MapControlContainer } from "@/components/ui/map"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useOverlayLayers } from "@/hooks/use-overlay-layers"
import { useOverlayFeeds, getFeedById } from "@/hooks/feeds/use-overlay-feeds"
import { LAYER_GROUPS, LAYER_META, LAYER_PRESETS } from "@/lib/feeds/layer-presets"
import type { LayerId } from "@/lib/feeds/types"
import { LayerStatusPill } from "./layer-status-pill"
import { cn } from "@/lib/utils"

export function LayersPopover({ className }: { className?: string }) {
  const { active, isActive, toggle, setPreset } = useOverlayLayers()
  const feeds = useOverlayFeeds()
  const activeCount = active.length

  return (
    <MapControlContainer className={className}>
      <Popover>
        <PopoverTrigger
          render={
            <Button
              variant={activeCount > 0 ? "default" : "outline"}
              size="icon"
              aria-label="Toggle map layers"
              title="Map layers"
              className={cn(
                "relative",
                activeCount > 0 && "ring-2 ring-primary/40"
              )}
            />
          }
        >
          <LayersIcon size={18} />
          {activeCount > 0 && (
            <span className="absolute -top-1 -right-1 inline-flex size-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-background tabular-nums">
              {activeCount}
            </span>
          )}
        </PopoverTrigger>

        <PopoverContent
          side="left"
          align="start"
          sideOffset={8}
          className="w-80 p-0"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
            <div className="flex items-center gap-1.5">
              <LayersIcon size={12} className="text-muted-foreground" />
              <span className="text-xs font-medium">Layers</span>
            </div>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {activeCount} active
            </span>
          </div>

          {/* Presets */}
          <div className="border-b px-3 py-2">
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
              Presets
            </div>
            <div className="flex flex-wrap gap-1">
              {LAYER_PRESETS.map((preset) => (
                <Button
                  key={preset.id}
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-[10px]"
                  onClick={() => setPreset(preset.layers)}
                  title={preset.description}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Grouped layer toggles */}
          <div className="max-h-[60vh] overflow-y-auto">
            {LAYER_GROUPS.map((group) => (
              <div key={group.id} className="border-b last:border-b-0">
                <div className="px-3 pt-2 pb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                  {group.label}
                </div>
                <div className="px-1 pb-1">
                  {group.layers.map((id) => (
                    <LayerRow
                      key={id}
                      id={id}
                      active={isActive(id)}
                      onToggle={() => toggle(id)}
                      feeds={feeds}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="border-t px-3 py-1.5 text-[9px] text-muted-foreground/60 leading-relaxed">
            Sources: USGS Earthquake Hazards · GDACS (EU JRC + UN OCHA) · NOAA
            NHC · NASA EONET · Smithsonian GVP · RainViewer.com · CelesTrak.
            Data refreshed on demand; no persistence.
          </div>
        </PopoverContent>
      </Popover>
    </MapControlContainer>
  )
}

function LayerRow({
  id,
  active,
  onToggle,
  feeds,
}: {
  id: LayerId
  active: boolean
  onToggle: () => void
  feeds: ReturnType<typeof useOverlayFeeds>
}) {
  const meta = LAYER_META[id]
  const feed = getFeedById(feeds, id)

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted/60",
        active && "bg-muted/40"
      )}
    >
      {/* Toggle indicator */}
      <span
        className={cn(
          "flex size-3.5 shrink-0 items-center justify-center rounded-full border transition-colors",
          active
            ? "border-primary bg-primary"
            : "border-muted-foreground/30 bg-transparent"
        )}
        aria-hidden
      >
        {active && (
          <span className="size-1.5 rounded-full bg-background" />
        )}
      </span>

      {/* Label + description */}
      <div className="min-w-0 flex-1">
        <div className={cn("text-[11px] font-medium", meta.accent)}>
          {meta.label}
        </div>
        <div className="truncate text-[10px] text-muted-foreground/70">
          {meta.description}
        </div>
      </div>

      {/* Freshness pill (only when active and feed is wired) */}
      {active && feed && (
        <LayerStatusPill
          status={feed.status}
          lastFetched={feed.lastFetched}
          itemCount={feed.itemCount}
          className="shrink-0"
        />
      )}
    </button>
  )
}
