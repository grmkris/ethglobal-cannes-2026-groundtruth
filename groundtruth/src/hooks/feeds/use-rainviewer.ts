"use client"

import { useCallback, useEffect, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { deriveLayerStatus } from "@/lib/feeds/geo"
import type { LayerHookResult, OverlayItem } from "@/lib/feeds/types"

// RainViewer publishes a manifest of timestamped radar tile URL paths.
// We pick the latest "past" frame and feed its URL template into a
// react-leaflet TileLayer inside an `overlay-raster` pane.
const MANIFEST_URL = "https://api.rainviewer.com/public/weather-maps.json"
const REFETCH_MS = 10 * 60_000

const TILE_SIZE = 256
const COLOR_SCHEME = 2 // Universal Blue
const SMOOTH = 1
const SNOW = 1

type RainViewerFrame = {
  time: number
  path: string
}

type RainViewerManifest = {
  host: string
  radar?: {
    past?: RainViewerFrame[]
    nowcast?: RainViewerFrame[]
  }
}

export type RainViewerInfo = {
  urlTemplate: string
  frameTime: Date
}

export type RainViewerResult = LayerHookResult<OverlayItem> & {
  urlTemplate: string | null
  frameTime: Date | null
}

function pickLatestFrame(manifest: RainViewerManifest): RainViewerInfo | null {
  const past = manifest.radar?.past
  if (!past?.length) return null
  const latest = past[past.length - 1]!
  const url = `${manifest.host}${latest.path}/${TILE_SIZE}/{z}/{x}/{y}/${COLOR_SCHEME}/${SMOOTH}_${SNOW}.png`
  return {
    urlTemplate: url,
    frameTime: new Date(latest.time * 1000),
  }
}

export function useRainViewer(
  options: { enabled?: boolean } = {}
): RainViewerResult {
  const { enabled = true } = options

  const query = useQuery({
    queryKey: ["feeds", "rainviewer", "manifest"],
    queryFn: async () => {
      const res = await fetch(MANIFEST_URL)
      if (!res.ok) throw new Error(`RainViewer returned ${res.status}`)
      const json = (await res.json()) as RainViewerManifest
      const info = pickLatestFrame(json)
      if (!info) throw new Error("No radar frames in RainViewer manifest")
      return info
    },
    enabled,
    staleTime: REFETCH_MS / 2,
    refetchInterval: REFETCH_MS,
  })

  useEffect(() => {
    if (query.error) {
      toast.error("RainViewer feed unreachable", {
        description: query.error.message,
        id: "feed-rainviewer-error",
      })
    }
  }, [query.error])

  const info = query.data
  const lastFetched = query.dataUpdatedAt
    ? new Date(query.dataUpdatedAt)
    : null

  const status = useMemo(
    () =>
      deriveLayerStatus({
        isPending: query.isPending,
        isError: query.isError,
        hasData: !!info,
        dataUpdatedAt: query.dataUpdatedAt,
        refetchIntervalMs: REFETCH_MS,
      }),
    [query.isPending, query.isError, info, query.dataUpdatedAt]
  )

  // RainViewer is a raster layer — no point items, no find-related semantics.
  // We satisfy the LayerHookResult shape with an empty array and a no-op
  // queryNearby so the popover and find-related composite can ignore it
  // uniformly.
  const queryNearby = useCallback(() => [], [])

  return {
    data: info ? [] : undefined,
    isLoading: query.isPending && !info,
    isError: query.isError,
    error: query.error,
    status,
    lastFetched,
    itemCount: info ? 1 : 0,
    queryNearby,
    urlTemplate: info?.urlTemplate ?? null,
    frameTime: info?.frameTime ?? null,
  }
}
