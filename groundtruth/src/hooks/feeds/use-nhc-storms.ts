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

// NHC publishes the active storm summary as a public JSON file. CORS is open.
// In v1 we render storm centers only — cone polygons are fetched per-storm
// from a different endpoint and added in a polish pass.
const NHC_URL = "https://www.nhc.noaa.gov/CurrentStorms.json"
const REFETCH_MS = 10 * 60_000

const CLASSIFICATION_LABELS: Record<string, string> = {
  TD: "Tropical Depression",
  TS: "Tropical Storm",
  HU: "Hurricane",
  STD: "Subtropical Depression",
  STS: "Subtropical Storm",
  PT: "Post-Tropical",
  RM: "Remnant",
}

export type NhcStorm = OverlayItem & {
  source: "nhc"
  classification: string
  classificationLabel: string
  intensityKt: number | null
  pressureMb: number | null
  movementDirDeg: number | null
  movementSpeedKt: number | null
}

type NhcRawStorm = {
  id?: string
  binNumber?: string
  name?: string
  classification?: string
  intensity?: string
  pressure?: string
  latitudeNumeric?: number
  longitudeNumeric?: number
  movementDir?: number
  movementSpeed?: number
  lastUpdate?: string
  publicAdvisory?: { url?: string }
}

type NhcResponse = {
  activeStorms?: NhcRawStorm[]
}

function classificationToSeverity(c: string | undefined): OverlaySeverity {
  switch (c) {
    case "HU":
      return "critical"
    case "TS":
    case "STS":
      return "high"
    case "TD":
    case "STD":
      return "medium"
    case "PT":
    case "RM":
      return "low"
    default:
      return "info"
  }
}

function toNum(v: string | number | undefined): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v
  if (typeof v === "string") {
    const n = parseFloat(v)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function normalize(storms: NhcRawStorm[] | undefined): NhcStorm[] {
  if (!storms?.length) return []
  const out: NhcStorm[] = []
  for (const s of storms) {
    const lat = s.latitudeNumeric
    const lng = s.longitudeNumeric
    if (
      typeof lat !== "number" ||
      typeof lng !== "number" ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    )
      continue
    const classification = s.classification ?? "?"
    const classificationLabel =
      CLASSIFICATION_LABELS[classification] ?? classification
    const name = s.name ?? s.id ?? "Unnamed storm"
    out.push({
      id: `nhc-${s.id ?? s.binNumber ?? name}`,
      source: "nhc",
      title: `${classificationLabel} ${name}`,
      description: s.intensity
        ? `${s.intensity} kt · ${s.pressure ?? "?"} mb`
        : undefined,
      lat,
      lng,
      timestamp: s.lastUpdate ? new Date(s.lastUpdate) : new Date(),
      severity: classificationToSeverity(classification),
      url: s.publicAdvisory?.url,
      classification,
      classificationLabel,
      intensityKt: toNum(s.intensity),
      pressureMb: toNum(s.pressure),
      movementDirDeg: typeof s.movementDir === "number" ? s.movementDir : null,
      movementSpeedKt:
        typeof s.movementSpeed === "number" ? s.movementSpeed : null,
    })
  }
  return out
}

export function useNhcStorms(
  options: { enabled?: boolean } = {}
): LayerHookResult<NhcStorm> {
  const { enabled = true } = options

  const query = useQuery({
    queryKey: ["feeds", "nhc", "current-storms"],
    queryFn: async () => {
      const res = await fetch(NHC_URL)
      if (!res.ok) throw new Error(`NHC feed returned ${res.status}`)
      const json = (await res.json()) as NhcResponse
      return normalize(json.activeStorms)
    },
    enabled,
    staleTime: REFETCH_MS / 2,
    refetchInterval: REFETCH_MS,
  })

  useEffect(() => {
    if (query.error) {
      toast.error("NHC feed unreachable", {
        description: query.error.message,
        id: "feed-nhc-error",
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
