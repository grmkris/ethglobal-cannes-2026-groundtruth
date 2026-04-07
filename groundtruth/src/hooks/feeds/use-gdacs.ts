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

// GDACS publishes a JSON feed at /gdacsapi/api/events/geteventlist/MAP. The
// endpoint historically supports CORS for browser fetches. If a future deploy
// finds that's no longer true, the fallback is to add a /api/feeds/gdacs
// backend proxy in the next PR.
const GDACS_URL =
  "https://www.gdacs.org/gdacsapi/api/events/geteventlist/MAP?eventlist=EQ;TC;FL;VO;WF;DR&alertlevel=Green;Orange;Red"
const REFETCH_MS = 5 * 60_000

const HAZARD_LABELS: Record<string, string> = {
  EQ: "Earthquake",
  TC: "Tropical Cyclone",
  FL: "Flood",
  VO: "Volcano",
  WF: "Wildfire",
  DR: "Drought",
}

export type GdacsHazard = OverlayItem & {
  source: "gdacs"
  hazardType: string
  hazardLabel: string
  alertLevel: "Green" | "Orange" | "Red"
  country: string | null
}

type GdacsFeature = {
  type?: string
  properties?: {
    eventid?: number | string
    eventtype?: string
    eventname?: string
    name?: string
    description?: string
    htmldescription?: string
    fromdate?: string
    alertlevel?: string
    severitydata?: { severitytext?: string }
    country?: string | null
    url?: { report?: string; details?: string }
  }
  geometry?: {
    type?: string
    coordinates?: number[]
  }
}

type GdacsResponse = {
  features?: GdacsFeature[]
}

function alertLevelToSeverity(level: string | undefined): OverlaySeverity {
  switch (level) {
    case "Red":
      return "critical"
    case "Orange":
      return "high"
    case "Green":
      return "low"
    default:
      return "info"
  }
}

function normalize(features: GdacsFeature[] | undefined): GdacsHazard[] {
  if (!features?.length) return []
  const out: GdacsHazard[] = []
  for (const f of features) {
    const props = f.properties
    const coords = f.geometry?.coordinates
    if (!props || !coords || coords.length < 2) continue
    const [lng, lat] = coords as [number, number]
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue

    const id = String(props.eventid ?? `${props.eventtype ?? "?"}-${lat},${lng}`)
    const hazardType = props.eventtype ?? "?"
    const hazardLabel = HAZARD_LABELS[hazardType] ?? hazardType
    const alertLevel = (props.alertlevel as GdacsHazard["alertLevel"]) ?? "Green"

    out.push({
      id: `gdacs-${id}`,
      source: "gdacs",
      title: props.eventname ?? props.name ?? hazardLabel,
      description: props.severitydata?.severitytext ?? props.description,
      lat,
      lng,
      timestamp: props.fromdate ? new Date(props.fromdate) : new Date(),
      severity: alertLevelToSeverity(props.alertlevel),
      url: props.url?.report ?? props.url?.details,
      hazardType,
      hazardLabel,
      alertLevel,
      country: props.country ?? null,
    })
  }
  return out
}

export function useGdacs(
  options: { enabled?: boolean } = {}
): LayerHookResult<GdacsHazard> {
  const { enabled = true } = options

  const query = useQuery({
    queryKey: ["feeds", "gdacs", "active"],
    queryFn: async () => {
      const res = await fetch(GDACS_URL)
      if (!res.ok) throw new Error(`GDACS feed returned ${res.status}`)
      const json = (await res.json()) as GdacsResponse
      return normalize(json.features)
    },
    enabled,
    staleTime: REFETCH_MS / 2,
    refetchInterval: REFETCH_MS,
  })

  useEffect(() => {
    if (query.error) {
      toast.error("GDACS feed unreachable", {
        description: query.error.message,
        id: "feed-gdacs-error",
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
