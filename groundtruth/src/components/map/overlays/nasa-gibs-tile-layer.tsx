"use client"

import { useMemo } from "react"
import { MapTileLayer } from "@/components/ui/map"

const GIBS_TEMPLATE =
  "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/{TIME}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg"

/** Yesterday's date in YYYY-MM-DD UTC — today's pass may not be processed yet. */
function buildGibsUrl(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 1)
  const time = d.toISOString().slice(0, 10)
  return GIBS_TEMPLATE.replace("{TIME}", time)
}

/**
 * NASA GIBS daily true-color base layer. Plugged into the existing
 * MapLayers base-layer toggle alongside "Default" and "Satellite".
 *
 * Note: this is a *base layer*, not an overlay — selecting it replaces the
 * underlying tile layer. It's not in the LayersPopover; it lives in the
 * existing bottom-right MapLayersControl.
 */
export function NasaGibsTileLayer() {
  const url = useMemo(() => buildGibsUrl(), [])
  return (
    <MapTileLayer
      name="NASA GIBS"
      url={url}
      attribution="Imagery courtesy NASA EOSDIS GIBS"
    />
  )
}
