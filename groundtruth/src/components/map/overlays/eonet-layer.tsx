"use client"

import L from "leaflet"
import { MapMarker, MapPane, MapTooltip } from "@/components/ui/map"
import type { EonetEvent } from "@/hooks/feeds/use-eonet"

const PANE_NAME = "overlay-point-large"
const PANE_Z_INDEX = 560

/** Build a small DOM-icon showing the EONET category emoji on a tinted disc. */
function makeEmojiIcon(emoji: string): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:9999px;background:rgba(59,130,246,0.18);border:1px solid rgba(59,130,246,0.55);font-size:13px;line-height:1;">${emoji}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  })
}

export function EonetLayer({ data }: { data: EonetEvent[] | undefined }) {
  if (!data?.length) return null

  return (
    <MapPane name={PANE_NAME} style={{ zIndex: PANE_Z_INDEX }}>
      {data.map((event) => (
        <MapMarker
          key={event.id}
          position={[event.lat, event.lng]}
          icon={makeEmojiIcon(event.emoji)}
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
