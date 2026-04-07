"use client"

import { useOverlayLayers } from "@/hooks/use-overlay-layers"
import { useOverlayFeeds } from "@/hooks/feeds/use-overlay-feeds"
import { UsgsEarthquakeLayer } from "./usgs-earthquake-layer"
import { GdacsLayer } from "./gdacs-layer"
import { NhcStormsLayer } from "./nhc-storms-layer"
import { EonetLayer } from "./eonet-layer"
import { GvpLayer } from "./gvp-layer"
import { RainViewerLayer } from "./rainviewer-layer"
import { SatelliteLayer } from "./satellite-layer"

/**
 * Renders all enabled overlay layers. Each layer component declares its own
 * Leaflet pane via <MapPane>, so z-order is enforced at the layer-component
 * level rather than centrally here.
 *
 * Render order is from "background" (small points) to "foreground" (larger
 * marker icons), but the actual stacking is governed by the panes' zIndex.
 */
export function OverlayLayers() {
  const { isActive } = useOverlayLayers()
  const feeds = useOverlayFeeds()

  return (
    <>
      {isActive("usgs") && <UsgsEarthquakeLayer data={feeds.usgs.data} />}
      {isActive("gdacs") && <GdacsLayer data={feeds.gdacs.data} />}
      {isActive("nhc") && <NhcStormsLayer data={feeds.nhc.data} />}
      {isActive("eonet") && <EonetLayer data={feeds.eonet.data} />}
      {isActive("gvp") && <GvpLayer data={feeds.gvp.data} />}
      {isActive("rainviewer") && (
        <RainViewerLayer urlTemplate={feeds.rainviewer.urlTemplate} />
      )}
      {isActive("satellites") && <SatelliteLayer data={feeds.satellites.data} />}
    </>
  )
}
