"use client"

import { MapCircleMarker, MapPane, MapTooltip } from "@/components/ui/map"
import type { NhcStorm } from "@/hooks/feeds/use-nhc-storms"

const PANE_NAME = "overlay-point-large"
const PANE_Z_INDEX = 555

function radiusForClassification(c: string): number {
  switch (c) {
    case "HU":
      return 14
    case "TS":
    case "STS":
      return 11
    case "TD":
    case "STD":
      return 9
    default:
      return 7
  }
}

function colorForClassification(c: string): string {
  switch (c) {
    case "HU":
      return "#7c3aed"
    case "TS":
    case "STS":
      return "#0ea5e9"
    case "TD":
    case "STD":
      return "#06b6d4"
    default:
      return "#94a3b8"
  }
}

export function NhcStormsLayer({ data }: { data: NhcStorm[] | undefined }) {
  if (!data?.length) return null

  return (
    <MapPane name={PANE_NAME} style={{ zIndex: PANE_Z_INDEX }}>
      {data.map((storm) => {
        const fill = colorForClassification(storm.classification)
        return (
          <MapCircleMarker
            key={storm.id}
            center={[storm.lat, storm.lng]}
            radius={radiusForClassification(storm.classification)}
            pane={PANE_NAME}
            pathOptions={{
              fillColor: fill,
              fillOpacity: 0.55,
              color: fill,
              weight: 2,
              pane: PANE_NAME,
            }}
            className=""
          >
            <MapTooltip side="top" sideOffset={6}>
              {storm.title}
              {storm.intensityKt != null ? ` · ${storm.intensityKt} kt` : ""}
            </MapTooltip>
          </MapCircleMarker>
        )
      })}
    </MapPane>
  )
}
