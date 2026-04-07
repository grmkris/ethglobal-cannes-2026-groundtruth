"use client"

import { useCallback, useEffect, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { deriveLayerStatus, filterNearby } from "@/lib/feeds/geo"
import type {
  LayerHookResult,
  OverlayItem,
  OverlaySeverity,
} from "@/lib/feeds/types"

const USGS_URL =
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson"
const REFETCH_MS = 60_000

export type UsgsEarthquake = OverlayItem & {
  source: "usgs"
  magnitude: number
  depthKm: number
  magType: string | null
  place: string
}

type UsgsFeature = {
  id: string
  type: "Feature"
  properties: {
    mag: number | null
    place: string | null
    time: number
    title: string
    url: string
    magType: string | null
  }
  geometry: {
    type: "Point"
    coordinates: [number, number, number]
  }
}

type UsgsResponse = {
  features: UsgsFeature[]
}

function magnitudeToSeverity(mag: number): OverlaySeverity {
  if (mag >= 6) return "critical"
  if (mag >= 5) return "high"
  if (mag >= 4) return "medium"
  if (mag >= 3) return "low"
  return "info"
}

function normalize(features: UsgsFeature[]): UsgsEarthquake[] {
  const out: UsgsEarthquake[] = []
  for (const f of features) {
    if (f.properties.mag == null) continue
    const [lng, lat, depth] = f.geometry.coordinates
    out.push({
      id: f.id,
      source: "usgs",
      title: f.properties.title,
      description: `${(f.properties.magType ?? "mag").toUpperCase()} ${f.properties.mag} · ${depth.toFixed(0)} km depth`,
      lat,
      lng,
      timestamp: new Date(f.properties.time),
      severity: magnitudeToSeverity(f.properties.mag),
      url: f.properties.url,
      magnitude: f.properties.mag,
      depthKm: depth,
      magType: f.properties.magType,
      place: f.properties.place ?? "",
    })
  }
  return out
}

export function useUsgsEarthquakes(
  options: { enabled?: boolean } = {}
): LayerHookResult<UsgsEarthquake> {
  const { enabled = true } = options

  const query = useQuery({
    queryKey: ["feeds", "usgs", "all_hour"],
    queryFn: async () => {
      const res = await fetch(USGS_URL)
      if (!res.ok) throw new Error(`USGS feed returned ${res.status}`)
      const json = (await res.json()) as UsgsResponse
      return normalize(json.features)
    },
    enabled,
    staleTime: REFETCH_MS / 2,
    refetchInterval: REFETCH_MS,
  })

  // Surface persistent errors as a toast (mirrors useEvents pattern)
  useEffect(() => {
    if (query.error) {
      toast.error("USGS feed unreachable", {
        description: query.error.message,
      })
    }
  }, [query.error])

  const data = query.data
  const lastFetched = query.dataUpdatedAt
    ? new Date(query.dataUpdatedAt)
    : null

  const status = useMemo(
    () =>
      deriveLayerStatus({
        isPending: query.isPending,
        isError: query.isError,
        hasData: !!data,
        dataUpdatedAt: query.dataUpdatedAt,
        refetchIntervalMs: REFETCH_MS,
      }),
    [query.isPending, query.isError, data, query.dataUpdatedAt]
  )

  const queryNearby = useCallback(
    (lat: number, lng: number, radiusKm: number, hoursBack: number) =>
      filterNearby(data, lat, lng, radiusKm, hoursBack),
    [data]
  )

  return {
    data,
    isLoading: query.isPending && !data,
    isError: query.isError,
    error: query.error,
    status,
    lastFetched,
    itemCount: data?.length ?? 0,
    queryNearby,
  }
}
