"use client"

import { useCallback, useEffect, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { deriveLayerStatus, filterNearby } from "@/lib/feeds/geo"
import type { LayerHookResult, OverlayItem } from "@/lib/feeds/types"

// NASA EONET v3 — keyless public access. CORS open. Curated multi-event feed:
// wildfires, volcanoes, severe storms, sea ice, dust, water color, etc.
const EONET_URL =
  "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=100"
const REFETCH_MS = 15 * 60_000

const CATEGORY_EMOJI: Record<string, string> = {
  wildfires: "🔥",
  volcanoes: "🌋",
  severeStorms: "🌀",
  seaLakeIce: "🧊",
  drought: "💧",
  dustHaze: "🌫️",
  earthquakes: "🌍",
  floods: "🌊",
  landslides: "⛰️",
  manmade: "🏭",
  snow: "❄️",
  tempExtremes: "🌡️",
  waterColor: "🟢",
}

export type EonetEvent = OverlayItem & {
  source: "eonet"
  categoryId: string
  categoryTitle: string
  emoji: string
}

type EonetGeometry = {
  date: string
  type: string
  coordinates: number[] | number[][]
}

type EonetRawEvent = {
  id?: string
  title?: string
  description?: string | null
  link?: string
  closed?: string | null
  categories?: { id?: string; title?: string }[]
  geometry?: EonetGeometry[]
}

type EonetResponse = {
  events?: EonetRawEvent[]
}

function pickLatestPoint(
  geometry: EonetGeometry[] | undefined
): { lat: number; lng: number; date: Date } | null {
  if (!geometry?.length) return null
  // Walk geometries newest-first; some events have track polylines, take a Point.
  const sorted = [...geometry].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )
  for (const g of sorted) {
    const coords = g.coordinates
    if (g.type === "Point" && Array.isArray(coords) && coords.length >= 2) {
      const [lng, lat] = coords as [number, number]
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return { lat, lng, date: new Date(g.date) }
      }
    }
    // Polygon / MultiPoint fallback: pick the first inner coord pair
    if (Array.isArray(coords) && coords.length > 0) {
      const first = coords[0]
      if (Array.isArray(first) && first.length >= 2) {
        const [lng, lat] = first as [number, number]
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          return { lat, lng, date: new Date(g.date) }
        }
      }
    }
  }
  return null
}

function normalize(events: EonetRawEvent[] | undefined): EonetEvent[] {
  if (!events?.length) return []
  const out: EonetEvent[] = []
  for (const e of events) {
    const point = pickLatestPoint(e.geometry)
    if (!point) continue
    const cat = e.categories?.[0]
    const categoryId = cat?.id ?? "unknown"
    const categoryTitle = cat?.title ?? "Event"
    out.push({
      id: e.id ?? `${e.title}-${point.lat}-${point.lng}`,
      source: "eonet",
      title: e.title ?? categoryTitle,
      description: e.description ?? undefined,
      lat: point.lat,
      lng: point.lng,
      timestamp: point.date,
      url: e.link,
      categoryId,
      categoryTitle,
      emoji: CATEGORY_EMOJI[categoryId] ?? "🛰️",
    })
  }
  return out
}

export function useEonet(
  options: { enabled?: boolean } = {}
): LayerHookResult<EonetEvent> {
  const { enabled = true } = options

  const query = useQuery({
    queryKey: ["feeds", "eonet", "open"],
    queryFn: async () => {
      const res = await fetch(EONET_URL)
      if (!res.ok) throw new Error(`EONET feed returned ${res.status}`)
      const json = (await res.json()) as EonetResponse
      return normalize(json.events)
    },
    enabled,
    staleTime: REFETCH_MS / 2,
    refetchInterval: REFETCH_MS,
  })

  useEffect(() => {
    if (query.error) {
      toast.error("NASA EONET feed unreachable", {
        description: query.error.message,
        id: "feed-eonet-error",
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
