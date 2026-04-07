"use client"

import { MapMarker, MapPane, MapTooltip } from "@/components/ui/map"
import type { EonetEvent } from "@/hooks/feeds/use-eonet"

const PANE_NAME = "overlay-point-large"
const PANE_Z_INDEX = 560

/** Small disc with the EONET category emoji. Rendered to HTML by MapMarker. */
function EmojiDisc({ emoji }: { emoji: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 22,
        height: 22,
        borderRadius: 9999,
        background: "rgba(59,130,246,0.18)",
        border: "1px solid rgba(59,130,246,0.55)",
        fontSize: 13,
        lineHeight: 1,
      }}
    >
      {emoji}
    </div>
  )
}

export function EonetLayer({ data }: { data: EonetEvent[] | undefined }) {
  if (!data?.length) return null

  return (
    <MapPane name={PANE_NAME} style={{ zIndex: PANE_Z_INDEX }}>
      {data.map((event) => (
        <MapMarker
          key={event.id}
          position={[event.lat, event.lng]}
          icon={<EmojiDisc emoji={event.emoji} />}
          iconAnchor={[11, 11]}
          pane={PANE_NAME}
        >
          <MapTooltip side="top" sideOffset={10}>
            {event.title}
          </MapTooltip>
        </MapMarker>
      ))}
    </MapPane>
  )
}
