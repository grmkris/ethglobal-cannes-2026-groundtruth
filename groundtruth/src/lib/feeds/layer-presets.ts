// Static metadata, layer grouping, and presets for the overlay popover.
// Adding a new layer = add an entry to LAYER_IDS (in types.ts), an entry to
// LAYER_META, optionally update presets.

import { LAYER_IDS, type LayerId } from "./types"

export type LayerGroup = "disaster" | "weather" | "mobility"

export type LayerMeta = {
  id: LayerId
  label: string
  shortLabel: string
  description: string
  attribution: string
  group: LayerGroup
  /** Color used for the layer's pill / icon hint in the popover. Tailwind. */
  accent: string
}

export const LAYER_META: Record<LayerId, LayerMeta> = {
  usgs: {
    id: "usgs",
    label: "USGS Earthquakes",
    shortLabel: "Quakes",
    description: "Global earthquakes M2.5+, refreshed every minute",
    attribution: "USGS Earthquake Hazards",
    group: "disaster",
    accent: "text-orange-500",
  },
  gdacs: {
    id: "gdacs",
    label: "GDACS Hazards",
    shortLabel: "Hazards",
    description: "UN-OCHA + EU JRC alerts: cyclones, floods, droughts, volcanoes, wildfires",
    attribution: "GDACS / EU JRC + UN OCHA",
    group: "disaster",
    accent: "text-red-500",
  },
  nhc: {
    id: "nhc",
    label: "NHC Active Storms",
    shortLabel: "Storms",
    description: "Active Atlantic + East Pacific tropical cyclones",
    attribution: "NOAA / National Hurricane Center",
    group: "weather",
    accent: "text-cyan-500",
  },
  eonet: {
    id: "eonet",
    label: "NASA EONET",
    shortLabel: "EONET",
    description: "NASA-curated natural events: wildfires, volcanoes, storms, ice",
    attribution: "NASA Earth Observatory",
    group: "disaster",
    accent: "text-blue-500",
  },
  gvp: {
    id: "gvp",
    label: "Smithsonian Volcanoes",
    shortLabel: "Volcanoes",
    description: "Holocene volcanoes catalog and weekly activity report",
    attribution: "Smithsonian Global Volcanism Program",
    group: "disaster",
    accent: "text-amber-500",
  },
  rainviewer: {
    id: "rainviewer",
    label: "Weather Radar",
    shortLabel: "Radar",
    description: "Global precipitation radar mosaic, latest frame",
    attribution: "RainViewer.com",
    group: "weather",
    accent: "text-sky-500",
  },
  satellites: {
    id: "satellites",
    label: "Satellites",
    shortLabel: "Sats",
    description: "Live ground tracks of curated satellites (ISS, Hubble, weather sats…)",
    attribution: "CelesTrak",
    group: "mobility",
    accent: "text-violet-500",
  },
}

export const LAYER_GROUP_LABELS: Record<LayerGroup, string> = {
  disaster: "Disasters",
  weather: "Weather",
  mobility: "Mobility",
}

/** Layer groups in display order. Filters out empty groups. */
export const LAYER_GROUPS: { id: LayerGroup; label: string; layers: LayerId[] }[] = (
  ["disaster", "weather", "mobility"] as const
)
  .map((g) => ({
    id: g,
    label: LAYER_GROUP_LABELS[g],
    layers: LAYER_IDS.filter((id) => LAYER_META[id].group === g),
  }))
  .filter((g) => g.layers.length > 0)

// --- Presets ---

export type LayerPreset = {
  id: string
  label: string
  description: string
  layers: readonly LayerId[]
}

export const LAYER_PRESETS: readonly LayerPreset[] = [
  {
    id: "off",
    label: "Off",
    description: "No overlays",
    layers: [],
  },
  {
    id: "disasters",
    label: "Disasters",
    description: "Quakes, hazards, storms, volcanoes",
    layers: ["usgs", "gdacs", "nhc", "eonet", "gvp"],
  },
  {
    id: "weather",
    label: "Weather",
    description: "Active storms + global radar",
    layers: ["nhc", "rainviewer"],
  },
  {
    id: "everything",
    label: "Everything",
    description: "All overlays in this build",
    layers: [...LAYER_IDS],
  },
] as const
