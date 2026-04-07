"use client"

// Composite hook that calls every overlay layer hook with the appropriate
// `enabled` flag based on the URL `?layers=` state. Both <OverlayLayers> and
// <LayersPopover> consume this — React Query dedupes the underlying fetches
// so there's no duplication cost.
//
// Adding a new feed = call its hook here and add it to the returned record.

import { useOverlayLayers } from "@/hooks/use-overlay-layers"
import type { LayerHookResult, LayerId } from "@/lib/feeds/types"
import {
  useUsgsEarthquakes,
  type UsgsEarthquake,
} from "./use-usgs-earthquakes"
import { useGdacs, type GdacsHazard } from "./use-gdacs"
import { useNhcStorms, type NhcStorm } from "./use-nhc-storms"
import { useEonet, type EonetEvent } from "./use-eonet"
import { useGvp, type GvpVolcano } from "./use-gvp"
import { useRainViewer, type RainViewerResult } from "./use-rainviewer"
import { useSatellites, type SatelliteRecord } from "./use-satellites"

export type OverlayFeeds = {
  usgs: LayerHookResult<UsgsEarthquake>
  gdacs: LayerHookResult<GdacsHazard>
  nhc: LayerHookResult<NhcStorm>
  eonet: LayerHookResult<EonetEvent>
  gvp: LayerHookResult<GvpVolcano>
  rainviewer: RainViewerResult
  satellites: LayerHookResult<SatelliteRecord>
}

/** Resolve a feed result by LayerId — used by the popover to render rows generically. */
export function getFeedById(
  feeds: OverlayFeeds,
  id: LayerId
): LayerHookResult<unknown> | null {
  switch (id) {
    case "usgs":
      return feeds.usgs as LayerHookResult<unknown>
    case "gdacs":
      return feeds.gdacs as LayerHookResult<unknown>
    case "nhc":
      return feeds.nhc as LayerHookResult<unknown>
    case "eonet":
      return feeds.eonet as LayerHookResult<unknown>
    case "gvp":
      return feeds.gvp as LayerHookResult<unknown>
    case "rainviewer":
      return feeds.rainviewer as LayerHookResult<unknown>
    case "satellites":
      return feeds.satellites as LayerHookResult<unknown>
    default:
      return null
  }
}

export function useOverlayFeeds(): OverlayFeeds {
  const { isActive } = useOverlayLayers()
  return {
    usgs: useUsgsEarthquakes({ enabled: isActive("usgs") }),
    gdacs: useGdacs({ enabled: isActive("gdacs") }),
    nhc: useNhcStorms({ enabled: isActive("nhc") }),
    eonet: useEonet({ enabled: isActive("eonet") }),
    gvp: useGvp({ enabled: isActive("gvp") }),
    rainviewer: useRainViewer({ enabled: isActive("rainviewer") }),
    satellites: useSatellites({ enabled: isActive("satellites") }),
  }
}
