"use client"

import { TileLayer } from "react-leaflet"
import { MapPane } from "@/components/ui/map"

const PANE_NAME = "overlay-raster"
const PANE_Z_INDEX = 360

/**
 * RainViewer animated radar — v1 renders only the latest "past" frame as a
 * single tile layer in the overlay-raster pane. Frame animation is deferred
 * to a polish pass (would require preloading multiple frames + crossfade).
 *
 * react-leaflet's TileLayer is imported directly here because the registry's
 * <MapTileLayer> is base-layer-only (it registers itself with MapLayersContext
 * and only renders when selected as the base map).
 */
export function RainViewerLayer({
  urlTemplate,
}: {
  urlTemplate: string | null
}) {
  if (!urlTemplate) return null

  return (
    <MapPane name={PANE_NAME} style={{ zIndex: PANE_Z_INDEX }}>
      <TileLayer
        key={urlTemplate}
        url={urlTemplate}
        pane={PANE_NAME}
        opacity={0.65}
        attribution="Radar &copy; RainViewer.com"
      />
    </MapPane>
  )
}
