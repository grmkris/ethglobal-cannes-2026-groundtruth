"use client"

import { useMapEvents } from "react-leaflet"

export function MapClickHandler({
  onClick,
  enabled = true,
}: {
  onClick: (lat: number, lng: number) => void
  enabled?: boolean
}) {
  useMapEvents({
    click(e) {
      if (!enabled) return
      onClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}
