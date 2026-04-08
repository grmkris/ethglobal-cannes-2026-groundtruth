// Shared types for the overlay feeds system.
// Each layer hook returns a LayerHookResult<TItem> shape so the popover and
// the find-related composite hook can treat them uniformly.

export const LAYER_IDS = [
  "usgs",
  "gdacs",
  "nhc",
  "eonet",
  "gvp",
  "rainviewer",
  "satellites",
  "predictions",
] as const

export type LayerId = (typeof LAYER_IDS)[number]

export type LayerStatus = "loading" | "live" | "stale" | "down"

export type OverlaySeverity = "info" | "low" | "medium" | "high" | "critical"

/** Unified shape every overlay layer normalizes to for find-related queries. */
export type OverlayItem = {
  id: string
  source: LayerId
  title: string
  description?: string
  lat: number
  lng: number
  timestamp: Date
  severity?: OverlaySeverity
  url?: string
}

export type RelatedItem = OverlayItem & {
  distanceKm: number
  hoursAgo: number
}

export type QueryNearby = (
  lat: number,
  lng: number,
  radiusKm: number,
  hoursBack: number,
) => RelatedItem[]

export type LayerHookResult<TItem = OverlayItem> = {
  data: TItem[] | undefined
  isLoading: boolean
  isError: boolean
  error: Error | null
  status: LayerStatus
  lastFetched: Date | null
  itemCount: number
  queryNearby: QueryNearby
}
