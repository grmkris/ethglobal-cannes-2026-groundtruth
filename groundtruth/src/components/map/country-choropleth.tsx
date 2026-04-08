"use client"

import { useMemo, useCallback } from "react"
import { useTheme } from "next-themes"
import type { Feature } from "geojson"
import L, { type Layer, type LeafletMouseEvent, type PathOptions } from "leaflet"
import type { WorldEvent } from "@/lib/orpc-types"
import { MapGeoJSON, MapPane } from "@/components/ui/map"
import { pointToCountryIso3 } from "@/lib/geo/country-of"
import { useCountryGeoJSON } from "@/hooks/use-country-geojson"

const COLOR_STEPS = [
  { max: 0, fillColor: "#94a3b8", fillOpacity: 0.06 },
  { max: 2, fillColor: "#3b82f6", fillOpacity: 0.15 },
  { max: 5, fillColor: "#3b82f6", fillOpacity: 0.28 },
  { max: 10, fillColor: "#2563eb", fillOpacity: 0.4 },
  { max: Infinity, fillColor: "#1d4ed8", fillOpacity: 0.55 },
]

const COLOR_STEPS_DARK = [
  { max: 0, fillColor: "#475569", fillOpacity: 0.08 },
  { max: 2, fillColor: "#60a5fa", fillOpacity: 0.12 },
  { max: 5, fillColor: "#60a5fa", fillOpacity: 0.22 },
  { max: 10, fillColor: "#3b82f6", fillOpacity: 0.35 },
  { max: Infinity, fillColor: "#2563eb", fillOpacity: 0.5 },
]

function getCountryStyle(
  count: number,
  isDark: boolean,
  isSelected: boolean,
): PathOptions {
  const steps = isDark ? COLOR_STEPS_DARK : COLOR_STEPS
  const step = steps.find((s) => count <= s.max) ?? steps[steps.length - 1]!
  const base: PathOptions = {
    fillColor: step.fillColor,
    fillOpacity: step.fillOpacity,
    weight: count > 0 ? 1 : 0.5,
    color: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)",
    pane: "choropleth",
  }
  if (isSelected) {
    return {
      ...base,
      weight: 2.5,
      color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.55)",
      fillOpacity: Math.min((base.fillOpacity ?? 0) + 0.18, 0.75),
    }
  }
  return base
}

export function CountryChoropleth({
  events,
  selectedCountryIso3,
  reportMode,
  onSelectCountry,
}: {
  events: WorldEvent[]
  selectedCountryIso3: string | null
  reportMode: boolean
  onSelectCountry: (iso3: string, name: string) => void
}) {
  const geoData = useCountryGeoJSON()
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  const countryCounts = useMemo(() => {
    if (!geoData) return new Map<string, number>()
    const counts = new Map<string, number>()
    for (const event of events) {
      const [lat, lng] = event.coordinates
      const iso = pointToCountryIso3(lat, lng, geoData)
      if (iso) counts.set(iso, (counts.get(iso) ?? 0) + 1)
    }
    return counts
  }, [geoData, events])

  const geoKey = useMemo(() => {
    const entries = Array.from(countryCounts.entries()).sort().join(",")
    return `${resolvedTheme}-${selectedCountryIso3 ?? "_"}-${entries}`
  }, [countryCounts, resolvedTheme, selectedCountryIso3])

  const style = useCallback(
    (feature: Feature | undefined) => {
      if (!feature) return {}
      const iso = (feature.properties?.ISO_A3 as string) ?? "UNK"
      const count = countryCounts.get(iso) ?? 0
      return getCountryStyle(count, isDark, iso === selectedCountryIso3)
    },
    [countryCounts, isDark, selectedCountryIso3],
  )

  const onEachFeature = useCallback(
    (feature: Feature, layer: Layer) => {
      const iso = (feature.properties?.ISO_A3 as string) ?? "UNK"
      const name = (feature.properties?.NAME as string) ?? "Unknown"
      const count = countryCounts.get(iso) ?? 0
      const isSelected = iso === selectedCountryIso3
      const isClickable = iso !== "-99"

      layer.bindTooltip(
        `<strong>${name}</strong>${
          count > 0 ? `<br/>${count} event${count !== 1 ? "s" : ""}` : ""
        }${isClickable ? "<br/><span style=\"opacity:0.7\">click to open</span>" : ""}`,
        { sticky: true },
      )

      const pathLayer = layer as Layer & {
        setStyle: (s: PathOptions) => void
        _originalStyle?: PathOptions
      }

      pathLayer._originalStyle = getCountryStyle(count, isDark, isSelected)

      layer.on({
        mouseover: (e: LeafletMouseEvent) => {
          const target = e.target as typeof pathLayer
          target.setStyle({
            fillOpacity: Math.min((target._originalStyle?.fillOpacity ?? 0) + 0.15, 0.7),
            weight: isSelected ? 2.5 : 2,
            color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.3)",
          })
        },
        mouseout: (e: LeafletMouseEvent) => {
          const target = e.target as typeof pathLayer
          if (target._originalStyle) {
            target.setStyle(target._originalStyle)
          }
        },
        click: (e: LeafletMouseEvent) => {
          if (reportMode) return
          if (!isClickable) return
          L.DomEvent.stopPropagation(e)
          onSelectCountry(iso, name)
        },
      })
    },
    [countryCounts, isDark, selectedCountryIso3, reportMode, onSelectCountry],
  )

  if (!geoData) return null

  return (
    <MapPane name="choropleth" style={{ zIndex: 350 }}>
      <MapGeoJSON
        key={geoKey}
        data={geoData}
        style={style}
        onEachFeature={onEachFeature}
      />
    </MapPane>
  )
}
