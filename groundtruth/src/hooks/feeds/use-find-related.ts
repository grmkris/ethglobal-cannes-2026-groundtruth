"use client"

import { useMemo } from "react"
import type { WorldEvent } from "@/lib/orpc-types"
import { useOverlayLayers } from "@/hooks/use-overlay-layers"
import { useOverlayFeeds } from "./use-overlay-feeds"
import { LAYER_META } from "@/lib/feeds/layer-presets"
import type { LayerId, RelatedItem } from "@/lib/feeds/types"

const DEFAULT_RADIUS_KM = 100
const DEFAULT_HOURS_BACK = 24

export type RelatedGroup = {
  id: LayerId
  label: string
  items: RelatedItem[]
}

/**
 * Composite hook: queries every currently-active overlay layer for items
 * within `radiusKm` of an event's coordinates, grouped by source.
 *
 * Only point-style layers contribute. Raster layers (RainViewer) and
 * mobility layers (satellites) are excluded — they don't have a meaningful
 * "find related" semantic.
 *
 * Inactive layers contribute nothing. Adding a new point layer = add an
 * entry to POINT_SOURCES below.
 */
export function useFindRelated(
  event: WorldEvent | null,
  options: { radiusKm?: number; hoursBack?: number } = {}
) {
  const { radiusKm = DEFAULT_RADIUS_KM, hoursBack = DEFAULT_HOURS_BACK } =
    options
  const { isActive } = useOverlayLayers()
  const feeds = useOverlayFeeds()

  return useMemo(() => {
    if (!event) return { groups: [] as RelatedGroup[], totalCount: 0 }

    const [lat, lng] = event.coordinates

    const POINT_SOURCES: LayerId[] = ["usgs", "gdacs", "nhc", "eonet", "gvp", "predictions"]

    const groups: RelatedGroup[] = []
    let totalCount = 0

    for (const id of POINT_SOURCES) {
      if (!isActive(id)) continue
      const feed = feeds[id as "usgs" | "gdacs" | "nhc" | "eonet" | "gvp" | "predictions"]
      const items = feed.queryNearby(lat, lng, radiusKm, hoursBack)
      if (items.length > 0) {
        groups.push({ id, label: LAYER_META[id].label, items })
        totalCount += items.length
      }
    }

    return { groups, totalCount }
  }, [event, isActive, feeds, radiusKm, hoursBack])
}
