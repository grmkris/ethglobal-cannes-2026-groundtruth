import booleanPointInPolygon from "@turf/boolean-point-in-polygon"
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson"

export function pointToCountryIso3(
  lat: number,
  lng: number,
  geo: FeatureCollection
): string | null {
  const point: [number, number] = [lng, lat]
  for (const feature of geo.features) {
    try {
      if (
        booleanPointInPolygon(
          point,
          feature as Feature<Polygon | MultiPolygon>
        )
      ) {
        const iso = feature.properties?.ISO_A3 as string | undefined
        if (iso && iso !== "-99") return iso
        return null
      }
    } catch {
      // skip features with invalid geometry
    }
  }
  return null
}

export function countryNameFromIso3(
  iso3: string,
  geo: FeatureCollection
): string | null {
  for (const feature of geo.features) {
    if ((feature.properties?.ISO_A3 as string | undefined) === iso3) {
      return (feature.properties?.NAME as string | undefined) ?? null
    }
  }
  return null
}

export function countryPropertiesFromIso3(
  iso3: string,
  geo: FeatureCollection
): Record<string, unknown> | null {
  for (const feature of geo.features) {
    if ((feature.properties?.ISO_A3 as string | undefined) === iso3) {
      return (feature.properties as Record<string, unknown>) ?? null
    }
  }
  return null
}

let cachedGeo: FeatureCollection | null = null
let inflight: Promise<FeatureCollection> | null = null

export async function loadCountryGeoJSON(): Promise<FeatureCollection> {
  if (cachedGeo) return cachedGeo
  if (inflight) return inflight
  inflight = fetch("/geo/ne_110m_admin_0_countries.geojson")
    .then((r) => r.json() as Promise<FeatureCollection>)
    .then((data) => {
      cachedGeo = data
      inflight = null
      return data
    })
    .catch((err) => {
      inflight = null
      throw err
    })
  return inflight
}

export function getCachedCountryGeoJSON(): FeatureCollection | null {
  return cachedGeo
}
