"use client"

import { useCallback, useEffect, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { deriveLayerStatus, filterNearby } from "@/lib/feeds/geo"
import { geocodeTags } from "@/lib/feeds/country-centroids"
import type { LayerHookResult, OverlayItem } from "@/lib/feeds/types"

// Polymarket Gamma API — fully public, no auth, open CORS.
// Fetch active geopolitical events ordered by volume.
const GAMMA_URL =
  "https://gamma-api.polymarket.com/events" +
  "?active=true&closed=false&order=volume&ascending=false&limit=50"
const REFETCH_MS = 5 * 60_000 // 5 min

export type PredictionMarket = OverlayItem & {
  source: "predictions"
  probability: number
  volume: number
  marketUrl: string
  outcomes: string[]
  outcomePrices: number[]
}

type GammaTag = { label?: string; slug?: string }

type GammaMarket = {
  id?: string
  question?: string
  outcomePrices?: string // JSON array string e.g. '["0.72","0.28"]'
  outcomes?: string // JSON array string e.g. '["Yes","No"]'
  volume?: string
  volumeNum?: number
  slug?: string
  active?: boolean
  closed?: boolean
}

type GammaEvent = {
  id?: string
  title?: string
  slug?: string
  description?: string
  volume?: number
  volumeNum?: number
  startDate?: string
  endDate?: string
  tags?: GammaTag[]
  markets?: GammaMarket[]
}

function parseJsonArray(raw: string | undefined): string[] {
  if (!raw) return []
  try {
    return JSON.parse(raw) as string[]
  } catch {
    return []
  }
}

function normalize(events: GammaEvent[] | undefined): PredictionMarket[] {
  if (!events?.length) return []
  const out: PredictionMarket[] = []

  for (const event of events) {
    const tags = event.tags ?? []
    const coords = geocodeTags(tags)
    if (!coords) continue // can't pin to map without geo

    // Use the first (highest-volume) market in the event group
    const market = event.markets?.[0]
    const outcomes = parseJsonArray(market?.outcomes)
    const prices = parseJsonArray(market?.outcomePrices).map(Number)
    const probability = prices[0] ?? 0.5
    const volume = event.volumeNum ?? (Number(event.volume) || 0)

    out.push({
      id: `poly-${event.id ?? event.slug ?? event.title}`,
      source: "predictions",
      title: market?.question ?? event.title ?? "Unknown market",
      description: event.description ?? undefined,
      lat: coords[0],
      lng: coords[1],
      timestamp: new Date(event.startDate ?? Date.now()),
      url: market?.slug
        ? `https://polymarket.com/event/${event.slug}`
        : undefined,
      probability,
      volume,
      marketUrl: event.slug
        ? `https://polymarket.com/event/${event.slug}`
        : "https://polymarket.com",
      outcomes,
      outcomePrices: prices,
    })
  }
  return out
}

export function usePredictionMarkets(
  options: { enabled?: boolean } = {}
): LayerHookResult<PredictionMarket> {
  const { enabled = true } = options

  const query = useQuery({
    queryKey: ["feeds", "predictions", "polymarket"],
    queryFn: async () => {
      const res = await fetch(GAMMA_URL)
      if (!res.ok) throw new Error(`Polymarket API returned ${res.status}`)
      const json = (await res.json()) as GammaEvent[]
      return normalize(json)
    },
    enabled,
    staleTime: REFETCH_MS / 2,
    refetchInterval: REFETCH_MS,
  })

  useEffect(() => {
    if (query.error) {
      toast.error("Polymarket feed unreachable", {
        description: query.error.message,
        id: "feed-predictions-error",
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
