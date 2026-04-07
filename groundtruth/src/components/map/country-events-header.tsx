"use client"

import { useMemo } from "react"
import { useEvents } from "@/hooks/use-events"
import { useCountryGeoJSON } from "@/hooks/use-country-geojson"
import { pointToCountryIso3 } from "@/lib/geo/country-of"
import { getCategoryConfig } from "@/lib/event-categories"
import type { WorldEventId } from "@/lib/typeid"

const PRESEED_LIMIT = 5

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.round(diffMs / 60_000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}

export function CountryEventsHeader({
  iso3,
  countryName,
  onSelectEvent,
}: {
  iso3: string
  countryName: string
  onSelectEvent: (id: WorldEventId) => void
}) {
  const { data: events = [] } = useEvents()
  const geo = useCountryGeoJSON()

  const inCountry = useMemo(() => {
    if (!geo) return []
    return events
      .filter(
        (e) =>
          pointToCountryIso3(e.coordinates[0], e.coordinates[1], geo) === iso3
      )
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, PRESEED_LIMIT)
  }, [events, geo, iso3])

  if (inCountry.length === 0) return null

  return (
    <div className="border-b bg-muted/30 px-3 py-2">
      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
        Recent in {countryName}
      </p>
      <div className="space-y-1">
        {inCountry.map((e) => {
          const config = getCategoryConfig(e.category)
          return (
            <button
              key={e.id}
              type="button"
              onClick={() => onSelectEvent(e.id)}
              className="flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-[11px] text-foreground/80 transition-colors hover:bg-muted/60 hover:text-foreground"
            >
              <span className="shrink-0">{config.emoji}</span>
              <span className="min-w-0 flex-1 truncate">{e.title}</span>
              <span className="shrink-0 text-[10px] text-muted-foreground/60">
                {relativeTime(e.timestamp)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
