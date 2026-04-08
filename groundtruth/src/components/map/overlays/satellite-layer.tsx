"use client"

import { useEffect, useRef } from "react"
import L from "leaflet"
import { GeodesicLine } from "leaflet.geodesic"
import { useMap } from "react-leaflet"
import * as satellite from "satellite.js"
import type { SatelliteRecord } from "@/hooks/feeds/use-satellites"

const PANE_LINE = "overlay-line"
const PANE_LINE_Z = 450
const PANE_POINT = "overlay-point-large"
const PANE_POINT_Z = 570

const TICK_INTERVAL_MS = 1_000 // 1 Hz position updates
const TRACK_PAST_MS = 5 * 60_000 // 5 min behind
const TRACK_FUTURE_MS = 30 * 60_000 // 30 min ahead
const TRACK_SAMPLES = 60

type Pos = { lat: number; lng: number; altKm: number }

const SAT_ICON = L.divIcon({
  className: "",
  html: `<div style="display:flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:9999px;background:rgba(167,139,250,0.3);border:1.5px solid rgba(167,139,250,0.85);font-size:11px;line-height:1;">🛰️</div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

function propagate(satrec: satellite.SatRec, when: Date): Pos | null {
  try {
    const eci = satellite.propagate(satrec, when)
    if (!eci || !eci.position || typeof eci.position === "boolean") return null
    const gmst = satellite.gstime(when)
    const geodetic = satellite.eciToGeodetic(eci.position, gmst)
    return {
      lat: satellite.degreesLat(geodetic.latitude),
      lng: satellite.degreesLong(geodetic.longitude),
      altKm: geodetic.height,
    }
  } catch {
    return null
  }
}

function buildTrack(
  satrec: satellite.SatRec,
  now: Date
): [number, number][] {
  const totalMs = TRACK_FUTURE_MS + TRACK_PAST_MS
  const step = totalMs / TRACK_SAMPLES
  const points: [number, number][] = []
  for (let i = 0; i <= TRACK_SAMPLES; i++) {
    const t = new Date(now.getTime() - TRACK_PAST_MS + i * step)
    const p = propagate(satrec, t)
    if (p) points.push([p.lat, p.lng])
  }
  return points
}

/**
 * Renders ground tracks + current positions for a curated set of satellites.
 *
 * Fully imperative — Leaflet objects (lines + markers) are created/updated
 * directly via `useMap()` rather than going through react-leaflet's
 * reconciliation. This avoids ~12 React re-renders per second and is the
 * canonical pattern for animated, externally-driven Leaflet layers.
 *
 * GeodesicLine handles antimeridian wrapping automatically — without it,
 * polylines would draw a horizontal stripe across the world whenever a
 * satellite crosses ±180° longitude.
 */
export function SatelliteLayer({
  data,
}: {
  data: SatelliteRecord[] | undefined
}) {
  const map = useMap()
  const linesRef = useRef<Map<string, GeodesicLine>>(new Map())
  const markersRef = useRef<Map<string, L.Marker>>(new Map())

  useEffect(() => {
    // Ensure custom panes exist (idempotent — safe to call repeatedly).
    if (!map.getPane(PANE_LINE)) {
      const pane = map.createPane(PANE_LINE)
      pane.style.zIndex = String(PANE_LINE_Z)
      pane.style.pointerEvents = "none"
    }
    if (!map.getPane(PANE_POINT)) {
      const pane = map.createPane(PANE_POINT)
      pane.style.zIndex = String(PANE_POINT_Z)
    }

    if (!data?.length) return

    const lines = linesRef.current
    const markers = markersRef.current

    function tick() {
      if (!data) return
      const now = new Date()

      for (const sat of data) {
        const current = propagate(sat.satrec, now)
        if (!current) continue

        // Update or create the ground-track polyline
        const track = buildTrack(sat.satrec, now)
        let line = lines.get(sat.id)
        if (!line) {
          line = new GeodesicLine([], {
            color: "#a78bfa",
            weight: 1.5,
            opacity: 0.65,
            pane: PANE_LINE,
            interactive: false,
          })
          line.addTo(map)
          lines.set(sat.id, line)
        }
        line.setLatLngs(track)

        // Update or create the current-position marker
        let marker = markers.get(sat.id)
        const tooltip = `${sat.name} · ${current.altKm.toFixed(0)} km`
        if (!marker) {
          marker = L.marker([current.lat, current.lng], {
            icon: SAT_ICON,
            pane: PANE_POINT,
            interactive: true,
          })
          marker.bindTooltip(tooltip, { direction: "top", offset: [0, -10] })
          marker.addTo(map)
          markers.set(sat.id, marker)
        } else {
          marker.setLatLng([current.lat, current.lng])
          marker.setTooltipContent(tooltip)
        }
      }
    }

    tick()
    const id = setInterval(tick, TICK_INTERVAL_MS)

    return () => {
      clearInterval(id)
      for (const line of lines.values()) line.remove()
      for (const marker of markers.values()) marker.remove()
      lines.clear()
      markers.clear()
    }
  }, [data, map])

  return null
}
