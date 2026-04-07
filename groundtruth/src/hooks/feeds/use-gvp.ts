"use client"

import { useCallback, useEffect, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { deriveLayerStatus, filterNearby } from "@/lib/feeds/geo"
import type { LayerHookResult, OverlayItem } from "@/lib/feeds/types"

// Smithsonian GVP — Weekly Volcanic Activity Report served as GeoJSON via
// their public GeoServer WFS endpoint. Refresh weekly (the report is updated
// once a week), but we poll every few hours to catch updates.
const GVP_URL =
  "https://webservices.volcano.si.edu/geoserver/GVP-VOTW/wfs?service=WFS&version=1.0.0&request=GetFeature&typeName=GVP-VOTW:E3WeeklyReport_View&outputFormat=application/json"
const REFETCH_MS = 4 * 60 * 60_000 // 4h — weekly source, refetch generously

export type GvpVolcano = OverlayItem & {
  source: "gvp"
  volcanoNumber: string | null
  volcanoName: string
  country: string | null
  reportPeriod: string | null
}

type GvpFeature = {
  type?: string
  properties?: {
    Volcano_Number?: number | string
    Volcano_Name?: string
    Country?: string
    Activity_Date?: string
    Activity_Type?: string
    Report_Period?: string
    Activity_Remarks?: string
  }
  geometry?: {
    type?: string
    coordinates?: number[]
  }
}

type GvpResponse = {
  features?: GvpFeature[]
}

function normalize(features: GvpFeature[] | undefined): GvpVolcano[] {
  if (!features?.length) return []
  const out: GvpVolcano[] = []
  for (const f of features) {
    const props = f.properties
    const coords = f.geometry?.coordinates
    if (!props || !coords || coords.length < 2) continue
    const [lng, lat] = coords as [number, number]
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue

    const name = props.Volcano_Name ?? "Unknown volcano"
    const number = props.Volcano_Number != null ? String(props.Volcano_Number) : null
    out.push({
      id: `gvp-${number ?? name}`,
      source: "gvp",
      title: name,
      description:
        props.Activity_Remarks ??
        props.Activity_Type ??
        "Volcanic activity reported",
      lat,
      lng,
      timestamp: props.Activity_Date
        ? new Date(props.Activity_Date)
        : new Date(),
      severity: "medium",
      volcanoNumber: number,
      volcanoName: name,
      country: props.Country ?? null,
      reportPeriod: props.Report_Period ?? null,
    })
  }
  return out
}

export function useGvp(
  options: { enabled?: boolean } = {}
): LayerHookResult<GvpVolcano> {
  const { enabled = true } = options

  const query = useQuery({
    queryKey: ["feeds", "gvp", "weekly"],
    queryFn: async () => {
      const res = await fetch(GVP_URL)
      if (!res.ok) throw new Error(`Smithsonian GVP returned ${res.status}`)
      const json = (await res.json()) as GvpResponse
      return normalize(json.features)
    },
    enabled,
    staleTime: REFETCH_MS / 2,
    refetchInterval: REFETCH_MS,
  })

  useEffect(() => {
    if (query.error) {
      toast.error("Smithsonian GVP feed unreachable", {
        description: query.error.message,
        id: "feed-gvp-error",
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
