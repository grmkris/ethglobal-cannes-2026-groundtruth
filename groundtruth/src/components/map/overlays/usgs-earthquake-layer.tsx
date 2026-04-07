"use client"

import { MapCircleMarker, MapPane, MapTooltip } from "@/components/ui/map"
import type { UsgsEarthquake } from "@/hooks/feeds/use-usgs-earthquakes"

const PANE_NAME = "overlay-point-small"
const PANE_Z_INDEX = 510

/** Quake circle radius scales with magnitude. M2 ≈ 4px, M5 ≈ 12px, M7 ≈ 20px. */
function radiusForMagnitude(mag: number): number {
  return Math.max(3, 2 + mag * 2.4)
}

/** Shallow quakes are visually warmer (more dangerous), deep ones cooler. */
function colorForDepth(depthKm: number): string {
  if (depthKm < 30) return "#f97316" // orange
  if (depthKm < 100) return "#fbbf24" // amber
  if (depthKm < 300) return "#60a5fa" // light blue
  return "#3b82f6" // deeper blue
}

export function UsgsEarthquakeLayer({
  data,
}: {
  data: UsgsEarthquake[] | undefined
}) {
  if (!data?.length) return null

  return (
    <MapPane name={PANE_NAME} style={{ zIndex: PANE_Z_INDEX }}>
      {data.map((quake) => {
        const fill = colorForDepth(quake.depthKm)
        return (
          <MapCircleMarker
            key={quake.id}
            center={[quake.lat, quake.lng]}
            radius={radiusForMagnitude(quake.magnitude)}
            pane={PANE_NAME}
            pathOptions={{
              fillColor: fill,
              fillOpacity: 0.7,
              color: "#0a0a0a",
              weight: 1,
              pane: PANE_NAME,
            }}
            className=""
          >
            <MapTooltip side="top" sideOffset={6}>
              {quake.title}
            </MapTooltip>
          </MapCircleMarker>
        )
      })}
    </MapPane>
  )
}
