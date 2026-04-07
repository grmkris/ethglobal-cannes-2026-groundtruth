"use client"

import { useCallback, useEffect, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import * as satellite from "satellite.js"
import { deriveLayerStatus } from "@/lib/feeds/geo"
import type { LayerHookResult } from "@/lib/feeds/types"

// Curated list of recognizable satellites — small enough to render comfortably
// even at 1Hz without performance concerns. Sourced from CelesTrak's TLE
// catalog. Names are matched against the first line of each TLE record.
const CURATED_SAT_NAMES = new Set([
  "ISS (ZARYA)",
  "CSS (TIANHE)",
  "HST",
  "NOAA 15",
  "NOAA 18",
  "NOAA 19",
  "GOES 16",
  "GOES 17",
  "SENTINEL-2A",
  "SENTINEL-2B",
  "METOP-A",
  "AQUA",
])

const CELESTRAK_GROUPS = [
  "stations",
  "science",
  "weather",
  "resource",
] as const

const REFETCH_MS = 6 * 60 * 60_000 // TLEs are valid for ~6 hours

export type SatelliteRecord = {
  id: string
  name: string
  satrec: satellite.SatRec
}

async function fetchGroup(group: string): Promise<string> {
  const res = await fetch(
    `https://celestrak.org/NORAD/elements/gp.php?GROUP=${group}&FORMAT=tle`,
    { cache: "no-store" }
  )
  if (!res.ok) throw new Error(`CelesTrak ${group} returned ${res.status}`)
  return res.text()
}

function parseTle(text: string): SatelliteRecord[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
  const out: SatelliteRecord[] = []
  for (let i = 0; i + 2 < lines.length; i += 3) {
    const name = lines[i]!.trim()
    if (!CURATED_SAT_NAMES.has(name)) continue
    try {
      const satrec = satellite.twoline2satrec(lines[i + 1]!, lines[i + 2]!)
      out.push({ id: name, name, satrec })
    } catch {
      // skip malformed TLE
    }
  }
  return out
}

export function useSatellites(
  options: { enabled?: boolean } = {}
): LayerHookResult<SatelliteRecord> {
  const { enabled = true } = options

  const query = useQuery({
    queryKey: ["feeds", "satellites", "celestrak"],
    queryFn: async () => {
      const groups = await Promise.all(CELESTRAK_GROUPS.map(fetchGroup))
      const records: SatelliteRecord[] = []
      for (const text of groups) {
        records.push(...parseTle(text))
      }
      return records
    },
    enabled,
    staleTime: REFETCH_MS / 2,
    refetchInterval: REFETCH_MS,
  })

  useEffect(() => {
    if (query.error) {
      toast.error("CelesTrak feed unreachable", {
        description: query.error.message,
        id: "feed-celestrak-error",
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

  // Satellites aren't a "find related" source — return empty.
  const queryNearby = useCallback(() => [], [])

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
