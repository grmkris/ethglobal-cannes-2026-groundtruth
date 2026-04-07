"use client"

import { MapCircleMarker, MapPane, MapTooltip } from "@/components/ui/map"
import type { GdacsHazard } from "@/hooks/feeds/use-gdacs"

const PANE_NAME = "overlay-point-large"
const PANE_Z_INDEX = 550

const ALERT_COLOR: Record<GdacsHazard["alertLevel"], string> = {
  Red: "#dc2626",
  Orange: "#ea580c",
  Green: "#16a34a",
}

const ALERT_RADIUS: Record<GdacsHazard["alertLevel"], number> = {
  Red: 11,
  Orange: 9,
  Green: 7,
}

export function GdacsLayer({ data }: { data: GdacsHazard[] | undefined }) {
  if (!data?.length) return null

  return (
    <MapPane name={PANE_NAME} style={{ zIndex: PANE_Z_INDEX }}>
      {data.map((hazard) => (
        <MapCircleMarker
          key={hazard.id}
          center={[hazard.lat, hazard.lng]}
          radius={ALERT_RADIUS[hazard.alertLevel]}
          pane={PANE_NAME}
          pathOptions={{
            fillColor: ALERT_COLOR[hazard.alertLevel],
            fillOpacity: 0.55,
            color: ALERT_COLOR[hazard.alertLevel],
            weight: 2,
            pane: PANE_NAME,
          }}
          className=""
        >
          <MapTooltip side="top" sideOffset={6}>
            {hazard.hazardLabel}
            {hazard.country ? ` · ${hazard.country}` : ""} ·{" "}
            {hazard.alertLevel}
          </MapTooltip>
        </MapCircleMarker>
      ))}
    </MapPane>
  )
}
