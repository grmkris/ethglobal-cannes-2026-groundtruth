"use client"

import { MapMarker, MapPane, MapTooltip } from "@/components/ui/map"
import type { GvpVolcano } from "@/hooks/feeds/use-gvp"

const PANE_NAME = "overlay-point-large"
const PANE_Z_INDEX = 565

function VolcanoDisc() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 22,
        height: 22,
        borderRadius: 9999,
        background: "rgba(245,158,11,0.18)",
        border: "1px solid rgba(245,158,11,0.6)",
        fontSize: 13,
        lineHeight: 1,
      }}
    >
      🌋
    </div>
  )
}

export function GvpLayer({ data }: { data: GvpVolcano[] | undefined }) {
  if (!data?.length) return null

  return (
    <MapPane name={PANE_NAME} style={{ zIndex: PANE_Z_INDEX }}>
      {data.map((volcano) => (
        <MapMarker
          key={volcano.id}
          position={[volcano.lat, volcano.lng]}
          icon={<VolcanoDisc />}
          iconAnchor={[11, 11]}
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
