"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useTheme } from "next-themes"
import booleanPointInPolygon from "@turf/boolean-point-in-polygon"
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson"
import type { Layer, LeafletMouseEvent, PathOptions } from "leaflet"
import type { WorldEvent } from "@/lib/orpc-types"
import { MapGeoJSON, MapLayerGroup, MapPane } from "@/components/ui/map"

let cachedGeoJSON: FeatureCollection | null = null

const COLOR_STEPS = [
  { max: 0, fillColor: "transparent", fillOpacity: 0 },
  { max: 2, fillColor: "#3b82f6", fillOpacity: 0.12 },
  { max: 5, fillColor: "#3b82f6", fillOpacity: 0.25 },
  { max: 10, fillColor: "#2563eb", fillOpacity: 0.35 },
  { max: Infinity, fillColor: "#1d4ed8", fillOpacity: 0.5 },
]

const COLOR_STEPS_DARK = [
  { max: 0, fillColor: "transparent", fillOpacity: 0 },
  { max: 2, fillColor: "#60a5fa", fillOpacity: 0.1 },
  { max: 5, fillColor: "#60a5fa", fillOpacity: 0.2 },
  { max: 10, fillColor: "#3b82f6", fillOpacity: 0.3 },
  { max: Infinity, fillColor: "#2563eb", fillOpacity: 0.45 },
]

function getCountryStyle(
  count: number,
  isDark: boolean,
): PathOptions {
  const steps = isDark ? COLOR_STEPS_DARK : COLOR_STEPS
  const step = steps.find((s) => count <= s.max) ?? steps[steps.length - 1]!
  return {
    fillColor: step.fillColor,
    fillOpacity: step.fillOpacity,
    weight: count > 0 ? 1 : 0.3,
    color: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)",
    pane: "choropleth",
  }
}

export function CountryChoropleth({ events }: { events: WorldEvent[] }) {
  const [geoData, setGeoData] = useState<FeatureCollection | null>(cachedGeoJSON)
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  useEffect(() => {
    if (cachedGeoJSON) return
    fetch("/geo/ne_110m_admin_0_countries.geojson")
      .then((r) => r.json())
      .then((data: FeatureCollection) => {
        cachedGeoJSON = data
        setGeoData(data)
      })
      .catch(console.error)
  }, [])

  const countryCounts = useMemo(() => {
    if (!geoData) return new Map<string, number>()
    const counts = new Map<string, number>()
    for (const event of events) {
      const [lat, lng] = event.coordinates
      const point: [number, number] = [lng, lat] // GeoJSON is [lng, lat]
      for (const feature of geoData.features) {
        try {
          if (
            booleanPointInPolygon(
              point,
              feature as Feature<Polygon | MultiPolygon>,
            )
          ) {
            const iso = (feature.properties?.ISO_A3 as string) ?? "UNK"
            counts.set(iso, (counts.get(iso) ?? 0) + 1)
            break
          }
        } catch {
          // skip features with invalid geometry
        }
      }
    }
    return counts
  }, [geoData, events])

  const geoKey = useMemo(() => {
    const entries = Array.from(countryCounts.entries()).sort().join(",")
    return `${resolvedTheme}-${entries}`
  }, [countryCounts, resolvedTheme])

  const style = useCallback(
    (feature: Feature | undefined) => {
      if (!feature) return {}
      const iso = (feature.properties?.ISO_A3 as string) ?? "UNK"
      const count = countryCounts.get(iso) ?? 0
      return getCountryStyle(count, isDark)
    },
    [countryCounts, isDark],
  )

  const onEachFeature = useCallback(
    (feature: Feature, layer: Layer) => {
      const iso = (feature.properties?.ISO_A3 as string) ?? "UNK"
      const name = (feature.properties?.NAME as string) ?? "Unknown"
      const count = countryCounts.get(iso) ?? 0

      if (count > 0) {
        layer.bindTooltip(
          `<strong>${name}</strong><br/>${count} event${count !== 1 ? "s" : ""}`,
          { sticky: true },
        )
      }

      const pathLayer = layer as Layer & {
        setStyle: (s: PathOptions) => void
        _originalStyle?: PathOptions
      }

      pathLayer._originalStyle = getCountryStyle(count, isDark)

      layer.on({
        mouseover: (e: LeafletMouseEvent) => {
          const target = e.target as typeof pathLayer
          target.setStyle({
            fillOpacity: Math.min((target._originalStyle?.fillOpacity ?? 0) + 0.15, 0.7),
            weight: 2,
            color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.3)",
          })
        },
        mouseout: (e: LeafletMouseEvent) => {
          const target = e.target as typeof pathLayer
          if (target._originalStyle) {
            target.setStyle(target._originalStyle)
          }
        },
      })
    },
    [countryCounts, isDark],
  )

  if (!geoData) return null

  return (
    <MapLayerGroup name="Country Activity">
      <MapPane name="choropleth" style={{ zIndex: 350 }}>
        <MapGeoJSON
          key={geoKey}
          data={geoData}
          style={style}
          onEachFeature={onEachFeature}
        />
      </MapPane>
    </MapLayerGroup>
  )
}
