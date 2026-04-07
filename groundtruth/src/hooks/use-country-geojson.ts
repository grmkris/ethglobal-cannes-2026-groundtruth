"use client"

import { useEffect, useState } from "react"
import type { FeatureCollection } from "geojson"
import { getCachedCountryGeoJSON, loadCountryGeoJSON } from "@/lib/geo/country-of"

export function useCountryGeoJSON(): FeatureCollection | null {
  const [geo, setGeo] = useState<FeatureCollection | null>(getCachedCountryGeoJSON())

  useEffect(() => {
    if (geo) return
    let cancelled = false
    loadCountryGeoJSON()
      .then((data) => {
        if (!cancelled) setGeo(data)
      })
      .catch(console.error)
    return () => {
      cancelled = true
    }
  }, [geo])

  return geo
}
