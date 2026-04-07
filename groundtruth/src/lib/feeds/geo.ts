// Pure helpers shared by every overlay layer hook.
// No React, no leaflet — safe to import anywhere.

import type { LayerStatus, OverlayItem, RelatedItem } from "./types"

const EARTH_RADIUS_KM = 6371

/** Haversine great-circle distance in kilometers. */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_KM * c
}

/** Hours between `then` and `now`. Positive if `then` is in the past. */
export function hoursBetween(then: Date, now: Date = new Date()): number {
  return (now.getTime() - then.getTime()) / 3_600_000
}

/**
 * Filter overlay items by spatial radius and time window relative to a target.
 * Returns RelatedItems annotated with distanceKm + hoursAgo, sorted by distance.
 */
export function filterNearby<T extends OverlayItem>(
  items: T[] | undefined,
  targetLat: number,
  targetLng: number,
  radiusKm: number,
  hoursBack: number,
  targetTime: Date = new Date(),
): RelatedItem[] {
  if (!items?.length) return []
  const result: RelatedItem[] = []
  for (const item of items) {
    const distanceKm = haversineKm(targetLat, targetLng, item.lat, item.lng)
    if (distanceKm > radiusKm) continue
    const hoursAgo = hoursBetween(item.timestamp, targetTime)
    if (hoursAgo > hoursBack || hoursAgo < -hoursBack) continue
    result.push({ ...item, distanceKm, hoursAgo })
  }
  result.sort((a, b) => a.distanceKm - b.distanceKm)
  return result
}

/**
 * Derive a coarse LayerStatus from React Query state + the expected refresh
 * cadence. Stale = data older than 2.5 * refetch interval.
 */
export function deriveLayerStatus(args: {
  isPending: boolean
  isError: boolean
  hasData: boolean
  dataUpdatedAt: number
  refetchIntervalMs: number
}): LayerStatus {
  if (args.isError && !args.hasData) return "down"
  if (!args.hasData) return "loading"
  const ageMs = Date.now() - args.dataUpdatedAt
  if (ageMs > args.refetchIntervalMs * 2.5) return "stale"
  return "live"
}

/** "47s ago" / "3m ago" / "2h ago" / "5d ago" / "—" if null. */
export function formatRelativeTime(date: Date | null): string {
  if (!date) return "—"
  const diffSec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000))
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h ago`
  const diffD = Math.floor(diffH / 24)
  return `${diffD}d ago`
}
