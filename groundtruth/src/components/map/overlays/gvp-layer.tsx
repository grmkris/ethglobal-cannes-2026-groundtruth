"use client"

import L from "leaflet"
import { MapMarker, MapPane, MapTooltip } from "@/components/ui/map"
import type { GvpVolcano } from "@/hooks/feeds/use-gvp"

const PANE_NAME = "overlay-point-large"
const PANE_Z_INDEX = 565

const VOLCANO_ICON = L.divIcon({
  className: "",
  html: `<div style="display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:9999px;background:rgba(245,158,11,0.18);border:1px solid rgba(245,158,11,0.6);font-size:13px;line-height:1;">🌋</div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})

export function GvpLayer({ data }: { data: GvpVolcano[] | undefined }) {
  if (!data?.length) return null

  return (
    <MapPane name={PANE_NAME} style={{ zIndex: PANE_Z_INDEX }}>
      {data.map((volcano) => (
        <MapMarker
          key={volcano.id}
          position={[volcano.lat, volcano.lng]}
          icon={VOLCANO_ICON}
          pane={PANE_NAME}
        >
          <MapTooltip side="top" sideOffset={10}>
            {volcano.volcanoName}
            {volcano.country ? ` · ${volcano.country}` : ""}
          </MapTooltip>
        </MapMarker>
      ))}
    </MapPane>
  )
}
