# Overlay Feeds — Implementation Plan

Companion to `overlay-feeds-brainstorm.md`. The brainstorm is the menu; this is the build path. Post-hackathon, no time pressure — the goal is to ship a robust live product.

> **Scope of this plan:** Phase A is the **implementable now** path — every overlay that needs nothing more than a fetch + render. Phases B/C/D are spec-only — they describe what's needed and what infra they require, so we can pull them off the shelf later.

---

## 0. Locked scope for first PR (this implementation)

After Q&A on 2026-04-07, the scope of the **first PR is locked** to the items below. Everything else in this document is reference material for future PRs.

### In scope (this PR)
- **A1** Plumbing — custom Leaflet panes, `useOverlayLayers` (nuqs `?layers=`), preset dictionary, freshness pill, `useFindRelated` composite hook, `<OverlayLayers>` wrapper
- **A2** Browser-direct GeoJSON feeds (5):
  - USGS Earthquakes
  - GDACS multi-hazard
  - NHC Active Storms (storm centers only — cones in a follow-up polish pass)
  - NASA EONET v3
  - Smithsonian GVP volcanoes
- **A3** Tile feeds (2):
  - NASA GIBS daily true-color (added as a new tile layer in the existing `MapLayers` toggle)
  - RainViewer animated radar (latest frame only — animation in a follow-up)
- **A5** Find Related Context — section on `EventDetailPanel`, queries every active overlay within 100km / 24h
- **Satellites** — CelesTrak TLE fetch + `satellite.js` SGP4 propagation + `Leaflet.Geodesic` ground-track polylines. Curated initial set of ~12 sats (ISS, CSS Tiangong, Hubble, a few NOAA weather sats, a couple Starlink representatives) — final list to iterate after first render.
- **Layer panel UX** — new dedicated **"Layers" button** on the right edge of the map → shadcn `Popover` containing: preset row at top, then collapsible groups (Base layers / Events / Overlays / Mobility), each row has `toggle + freshness pill + info tooltip`. The existing `MapLayersControl` is replaced by this for everything except the "Default / Satellite / NASA GIBS" tile layers, which stay in the existing layer toggle.

### Out of scope (this PR — explicitly deferred)
- **A4** Backend-proxied feeds (NWS, FIRMS, OpenAQ, ReliefWeb, Cloudflare Radar) — deferred to a follow-up PR. The user will obtain `FIRMS_MAP_KEY`, `OPENAQ_API_KEY`, and `CLOUDFLARE_API_TOKEN` between sessions. NWS and ReliefWeb are keyless but ship in the same A4 batch.
- **CISA KEV** — no map render, no Find Related integration in this PR. Deferred.
- **Phase B** Monitor agents — separate spec
- **Phase C** WebSocket sidecars (AISStream, Bluesky), WebGL flight rendering — separate spec
- **Phase D** Time scrub, opacity controls, wind particle field, mobile drawer, animated radar playback, embeddable widget — separate spec

### Locked decisions (defaults I'm picking, no further questions)
- **Default preset on first visit** = `Off` (no overlays). Existing visual identity unchanged for current users.
- **Filter coupling** = overlays are **independent** of the existing `?categories=` event filter. Two control surfaces, two URL params (`?categories=` for events, `?layers=` for overlays), no cross-coupling.
- **Click behavior on overlay items** = tooltip on hover, no click action. Click on a Ground Truth event always wins so users can't accidentally hijack the event detail panel by clicking on a quake dot.
- **Find Related Context default state** = collapsed with count visible (`Related context · 5 nearby items`). Click chevron to expand. Auto-expanded if any related items are present and the panel was just opened — TBD, lean toward collapsed for less visual clutter.
- **NHC v1** = storm centers only. Cone polygons added in a polish pass after the panel UX lands.
- **RainViewer v1** = latest radar frame only. Animation deferred.
- **Satellites v1** = curated list of ~12 sats. Update list after first render based on what looks good.
- **No new schema columns.** Phase A is purely client-side; the database is untouched.
- **No new dependencies except for satellites.** Two new packages: `satellite.js` (TLE → SGP4 → lat/lng) and `leaflet.geodesic` (antimeridian-aware polylines). Both are stable, small, MIT-licensed.
- **No new env vars.** All A4 env vars (`FIRMS_MAP_KEY`, `OPENAQ_API_KEY`, `CLOUDFLARE_API_TOKEN`) move to the next PR.
- **Commit strategy** = single PR. Will list affected files in chat for explicit approval before pushing per the user's `>15 files = ask first` rule.

### Build order (within this PR)
1. **Plumbing** (A1) — types, panes, hooks, popover shell, freshness pill, find-related skeleton
2. **Browser-direct overlays** (A2) — USGS first as the canary, then GDACS, NHC, EONET, GVP
3. **Tile overlays** (A3) — NASA GIBS, RainViewer
4. **Satellites** — CelesTrak hook + `<SatelliteLayer>` with the geodesic plugin
5. **Find Related Context** (A5) — wire each layer hook into the composite, render the section in `EventDetailPanel`
6. **Polish pass** — empty states, error toasts, loading skeletons, attribution footer
7. **Self-review** — typecheck (only when explicitly asked), final file list

After this PR ships and is validated in production, the next PR is **A4** (the 5 backend-proxied feeds). After that, **Phase B** (monitor agents).

---

## 1. Goals & non-goals

### Goals

- Render every Tier 1 free feed (USGS, GDACS, NHC, EONET, NWS, GIBS, RainViewer, FIRMS, GVP, OpenAQ, ReliefWeb, Cloudflare Radar, CISA KEV) on the existing Leaflet map as toggleable overlay layers.
- Render satellite ground tracks client-side from CelesTrak TLEs.
- Add the **"Find related context"** feature on `EventDetailPanel` — click any user-reported Ground Truth event, see what every active overlay feed knows about that lat/lng/time.
- Add a **layer preset system** so users can pick a story ("Disasters", "Cyber", "All") instead of toggling 14 individual switches.
- Add a **per-layer freshness pill** so users can see which feeds are live, stale, or down — beats every other map's single global indicator.
- Reuse the existing `MapPane` / `MapGeoJSON` / `MapLayerGroup` / `MapTileLayer` wrappers from `groundtruth/src/components/ui/map.tsx`. **No new map dependencies in Phase A.**
- Reuse the existing nuqs URL state pattern and React Query polling pattern. URL-shareable layer state.
- Keep events visually dominant — overlay markers are always smaller, less saturated, and below the event marker pane.

### Non-goals (for Phase A)

- **No persistence of overlay items** — every layer's data lives in React Query state, not the database. The map shows the overlay firehose; persisted Ground Truth events are still the only thing that goes in `worldEvent`.
- **No autonomous monitor agents** — agents that poll feeds and submit canonical events live in Phase B (planned, deferred).
- **No flight rendering** — OpenSky / adsb.lol require WebGL (`Leaflet.PixiOverlay`) for usable performance. Spec'd in Phase B.
- **No ship rendering** — AISStream is WebSocket-only and needs a sidecar service. Spec'd in Phase C.
- **No schema changes** — Phase A is purely client-side overlays.
- **No new RPC procedures** — overlay data flows through Hono REST routes (`/api/feeds/*`) for the 4 layers that need a backend proxy. The oRPC router is untouched.
- **No category expansion** — overlay events map to the existing 8 categories. No new event_category enum values.
- **No sidebar list of overlay items** — overlays only appear on the map. The sidebar continues to show user-reported events only.
- **No mobile drawer / sheet UX** — the existing `MapLayersControl` is extended in place. Mobile redesign deferred to Phase D.

---

## 2. Current architecture (what we extend)

From the code review:

| Concept | Where it lives | How we extend it |
|---|---|---|
| Map composition | `groundtruth/src/components/map/world-map.tsx:181` — `<Map>` wraps `<MapLayers>` which currently holds `<MapTileLayer>`, `<CountryChoropleth>`, `<EventMarkers>`, `<MapLayersControl>` | Insert new `<OverlayLayers>` component holding all Phase A overlay layers between `<CountryChoropleth>` and `<EventMarkers>` |
| Polygon overlay template | `groundtruth/src/components/map/country-choropleth.tsx:144` — `<MapPane name="choropleth" style={{ zIndex: 350 }}>` wrapping `<MapGeoJSON>` | Mirror this exact shape for `<NwsAlertsLayer>`, `<NhcConeLayer>`, `<FirmsLayer>` etc. |
| Marker pattern | `groundtruth/src/components/map/event-markers.tsx:25` — `<MapLayerGroup>` → `<MapMarkerClusterGroup>` → `<MapMarker>` | Mirror for high-volume point overlays (FIRMS, USGS) with custom icons |
| Polling pattern | `groundtruth/src/hooks/use-events.ts:8` — `useQuery({ refetchInterval: 30_000 })` plus toast on error | Per-layer hooks: `useUsgsEarthquakes`, `useGdacs`, `useNhcStorms`, etc. Each with its own interval. |
| URL state pattern | `groundtruth/src/hooks/use-event-filters.ts:16` — `useQueryStates({ categories: parseAsArrayOf(parseAsStringLiteral(...), ",") })` with `null = all selected` semantics | New `useOverlayLayers` hook with `?layers=usgs,gdacs,firms` param |
| Hono REST extension | `groundtruth/src/server/create-api.ts:40` — `app.basePath("/api")`, sub-app at `/agent`, oRPC at `/rpc` | Add new sub-app at `/feeds` for backend-proxied overlays (FIRMS, OpenAQ, ReliefWeb, Cloudflare Radar, CISA KEV) |
| Categories (fixed) | `groundtruth/src/lib/event-constants.ts:4` — 8 categories | Map every overlay to one of these. No new categories. |
| Custom panes | Already used at `country-choropleth.tsx:144` (zIndex 350) | Allocate panes 360-599 for new overlays. See §3.3. |

---

## 3. Architecture decisions

### 3.1 Where overlay data lives

**Decision:** React Query cache only, never the database.

Each overlay has its own hook (e.g., `useUsgsEarthquakes`) that fetches at the appropriate cadence and caches in React Query. Components subscribe via the hook. When the user toggles a layer off, `enabled: false` stops the polling. When the tab is hidden, `refetchIntervalInBackground: false` (the default) pauses fetches.

**Why:** the firehose isn't worth persisting. USGS alone produces dozens of M2.5+ quakes per hour; FIRMS produces thousands of fire pixels per day. Persisting them would bloat `worldEvent` and conflate "user-reported events" with "raw feed items." Keep the conceptual line clean: **overlays are visualization, events are content**. When Phase B (monitor agents) lands, the *agent* decides which feed items become canonical events — that's where persistence lives.

### 3.2 Layer registry / Find Related Context

**Decision:** A composite hook that knows about all overlay hooks and fans out queries.

```ts
// groundtruth/src/hooks/use-find-related.ts
export function useFindRelated(event: WorldEvent | null) {
  const usgs = useUsgsEarthquakes({ enabled: !!event })
  const gdacs = useGdacs({ enabled: !!event })
  const firms = useFirms({ enabled: !!event })
  // ... etc

  return useMemo(() => {
    if (!event) return null
    const radiusKm = 100
    const hoursBack = 24

    return {
      usgs: usgs.queryNearby(event.latitude, event.longitude, radiusKm, hoursBack),
      gdacs: gdacs.queryNearby(event.latitude, event.longitude, radiusKm, hoursBack),
      firms: firms.queryNearby(event.latitude, event.longitude, radiusKm, hoursBack),
      // ...
    }
  }, [event, usgs.data, gdacs.data, firms.data, /* ... */])
}
```

Each layer hook returns `{ data, isLoading, error, queryNearby }` where `queryNearby` is a pure synchronous function over the in-memory data. No singletons, no React context, no dynamic registration — just an explicit list in one file.

**Why:** singletons in React are awkward, dynamic registration is magic, and the number of overlay layers is small (~14). An explicit list in one composite hook is the most boring, maintainable thing that works. Adding a new layer = add 1 line in `useFindRelated` + 1 line in the panel rendering.

### 3.3 Custom Leaflet pane z-order

Leaflet's default panes (tile 200, path 400, marker 600, tooltip 650, popup 700) are the baseline. We add custom panes for overlay layers, all explicitly between 350 and 599 so events (default marker pane = 600) always sit on top.

| Pane name | zIndex | Used by |
|---|---|---|
| `tile` (default) | 200 | base map + satellite tile layers |
| `choropleth` (existing) | 350 | `CountryChoropleth` |
| `overlay-raster` | 360 | RainViewer radar tiles, NASA GIBS overlay layers |
| `overlay-polygon` | 400 | NWS alert polygons, NHC cones, FIRMS perimeters (rare) |
| `overlay-line` | 450 | Satellite ground tracks (Phase B) |
| `overlay-point-small` | 500 | USGS quakes (small dots), FIRMS fire pixels |
| `overlay-point-large` | 550 | NHC storm centers, EONET event icons, GVP volcanoes, GDACS pins |
| `marker` (default) | 600 | Ground Truth events (untouched) |
| `marker-selected` | 640 | Selected event halo (future enhancement) |

Created via a one-shot effect in `<OverlayLayers>` mount:

```ts
useEffect(() => {
  const map = useMap() // or via context
  if (!map.getPane('overlay-raster')) {
    map.createPane('overlay-raster').style.zIndex = '360'
    map.createPane('overlay-polygon').style.zIndex = '400'
    // ...
  }
}, [map])
```

Each layer component then sets `pane: 'overlay-polygon'` etc. on its render path, just like `country-choropleth.tsx:40` does today.

### 3.4 Visual hierarchy (events stay dominant)

- **Saturation:** overlay marker colors capped at ~60% saturation. Event marker colors stay 100%.
- **Size:** overlay points 6–14px diameter. Event markers stay at ~28px with their existing halo.
- **Z-order:** enforced via panes (above).
- **Opacity:** raster overlays (radar) at 0.5–0.7. Polygon overlays at 0.4 default fill. Lines at 0.7. Points at 0.85.
- **Interactivity:** overlay items get tooltips (hover) but clicking does NOT open the event detail panel. Click on a Ground Truth event always wins. Overlays are corroboration, not content.

### 3.5 Backend proxy vs direct browser fetch

**Direct browser fetch** for feeds that:
- Have permissive CORS headers
- Don't require a secret key (or the key is OK to embed)
- Don't have per-IP rate limits that a popular deploy would breach

| Feed | Browser-direct? | Reason |
|---|---|---|
| USGS Earthquakes | ✅ yes | CORS-enabled, no key, no rate limit |
| GDACS GeoJSON | ✅ yes | CORS-enabled, CC BY 4.0 |
| NHC CurrentStorms.json | ✅ yes | US PD, CORS works |
| NASA EONET v3 | ✅ yes (with API key in URL or NASA's keyless mode) | CORS works; key can be embedded |
| NASA GIBS WMTS tiles | ✅ yes | Pure tile URLs, CORS-friendly |
| RainViewer | ✅ yes | Pure tile URLs, no key, CORS-friendly |
| Smithsonian GVP | ✅ yes | WFS/GeoJSON with CORS |
| CelesTrak TLEs | ✅ yes | CORS-enabled, public |
| **NWS Active Alerts** | ❌ proxy | Strict User-Agent enforcement; bare browser fetch can 403 |
| **NASA FIRMS** | ❌ proxy | CSV → GeoJSON conversion + MAP_KEY caching |
| **OpenAQ** | ❌ proxy | API key (free, but should not ship in client bundle) |
| **ReliefWeb** | ❌ proxy | 1k calls/day per IP — backend cache shares across users |
| **Cloudflare Radar** | ❌ proxy | API token, server-side only |
| **CISA KEV** | ❌ proxy | (no map render — see §6.13) |

Backend proxy lives at `/api/feeds/<source>`, mounted via a new `feedsApp` Hono sub-app on `create-api.ts:67` next to the existing `agentApp`. Each route caches upstream responses in process memory (or Vercel Edge Cache via `Cache-Control` headers) for the appropriate TTL (5–60 min depending on feed cadence).

### 3.6 nuqs URL state for layers

New `useOverlayLayers` hook in `groundtruth/src/hooks/use-overlay-layers.ts`. Same pattern as `useEventFilters` but for the `?layers=` param.

```ts
const LAYER_IDS = [
  "usgs", "gdacs", "nhc", "eonet", "nws", "firms",
  "gvp", "openaq", "reliefweb", "cloudflare-radar",
  "rainviewer", "gibs", "satellites",
] as const
type LayerId = (typeof LAYER_IDS)[number]

export function useOverlayLayers() {
  const [active, setActive] = useQueryState(
    "layers",
    parseAsArrayOf(parseAsStringLiteral(LAYER_IDS), ",").withDefault([])
  )

  const isActive = (id: LayerId) => active.includes(id)
  const toggle = (id: LayerId) => setActive(
    active.includes(id) ? active.filter(x => x !== id) : [...active, id]
  )
  const setPreset = (ids: LayerId[]) => setActive(ids)
  const clear = () => setActive([])

  return { active, isActive, toggle, setPreset, clear }
}
```

URL: `https://groundtruth.grm.wtf/?layers=usgs,gdacs,firms` shares a layer combo. Empty array (default) = no overlays.

### 3.7 Layer presets

Static dictionary in `groundtruth/src/lib/layer-presets.ts`:

```ts
export const LAYER_PRESETS = [
  {
    id: "off",
    label: "Off",
    description: "Just events",
    layers: [],
  },
  {
    id: "disasters",
    label: "Disasters",
    description: "Quakes, fires, storms, weather alerts",
    layers: ["usgs", "gdacs", "nhc", "firms", "nws", "rainviewer"],
  },
  {
    id: "satellite",
    label: "Satellite imagery",
    description: "NASA daily true color + tracked satellites",
    layers: ["gibs", "satellites"],
  },
  {
    id: "humanitarian",
    label: "Humanitarian",
    description: "GDACS + ReliefWeb + EONET",
    layers: ["gdacs", "reliefweb", "eonet"],
  },
  {
    id: "tech",
    label: "Tech & cyber",
    description: "Internet outages",
    layers: ["cloudflare-radar"],
  },
  {
    id: "everything",
    label: "Everything",
    description: "All overlays — may impact perf",
    layers: [...LAYER_IDS],
  },
] as const
```

Rendered as a horizontal row of buttons at the top of the layer panel. Click → `setPreset(preset.layers)`.

### 3.8 Freshness pill component

New shadcn-style component at `groundtruth/src/components/map/layer-status-pill.tsx`:

```ts
type Status = "live" | "stale" | "down" | "loading"
type Props = { status: Status; lastFetched: Date | null }
```

- `live` = green dot, pulses for 1.5s after a successful refetch
- `stale` = yellow dot, "47s ago" relative time
- `down` = red dot, error tooltip
- `loading` = spinner

Each layer hook returns a `status` field derived from React Query state (`isPending`, `isError`, `dataUpdatedAt`, `errorUpdatedAt`). The pill renders inside the layer row in the layer panel.

---

## 4. Per-feed integration spec

For each Phase A feed: source URL, hook name, render shape, refresh interval, mapping to event category, queryNearby semantics.

### 4.1 USGS Earthquakes
- **Hook:** `useUsgsEarthquakes` at `src/hooks/feeds/use-usgs-earthquakes.ts`
- **Source:** `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson` (rotate to `all_day.geojson` if user wants more history)
- **License:** US public domain
- **Direct browser fetch** ✅
- **Refresh:** 60s
- **Render:** `<UsgsEarthquakeLayer>` — `MapCircleMarker` per feature, radius scaled by `Math.exp(magnitude * 0.5)`, fill color by depth (orange shallow, red mid, blue deep). Pane: `overlay-point-small`.
- **Tooltip:** "M{mag} — {place} — {depth}km — {time}"
- **Maps to category:** `natural-disaster`
- **queryNearby:** filter features within `radiusKm` (haversine on `geometry.coordinates`) + within `hoursBack` of `event.timestamp` (using `properties.time` ms epoch).
- **Initial dedupe:** USGS event ID (`features[].id`) is the canonical ID — used for React Query cache key per feature, no duplication concerns.

### 4.2 GDACS multi-hazard
- **Hook:** `useGdacs`
- **Source:** `https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?fromDate=...&toDate=...&alertlevel=Green;Orange;Red`
- **License:** CC BY 4.0
- **Direct browser fetch** ✅ (returns JSON with `features[]` array)
- **Refresh:** 5min
- **Render:** `<GdacsLayer>` — `MapMarker` with category-specific icon (`EQ`, `TC`, `FL`, `VO`, `WF`, `DR`) and color by alert level (green/orange/red). Pane: `overlay-point-large`.
- **Maps to category:** all hazards → `natural-disaster`
- **queryNearby:** same haversine filter
- **Attribution:** "GDACS / EU JRC + UN OCHA"

### 4.3 NHC Active Storms
- **Hook:** `useNhcStorms`
- **Source:** `https://www.nhc.noaa.gov/CurrentStorms.json` for the storm list, then for each active storm fetch the cone polygon from the per-storm GIS endpoint listed in the index
- **License:** US public domain
- **Direct browser fetch** ✅
- **Refresh:** 10min (advisories are slow)
- **Render:** `<NhcStormsLayer>` — `MapPolygon` for each cone (pane: `overlay-polygon`), `MapCircleMarker` for the eye position scaled by Saffir-Simpson category (pane: `overlay-point-large`)
- **Maps to category:** `natural-disaster`
- **queryNearby:** polygon contains-point check on cones; haversine on eye positions
- **Edge case:** at any given time there are 0–6 active storms. Cheap.

### 4.4 NASA EONET v3
- **Hook:** `useEonet`
- **Source:** `https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=100`
- **License:** NASA open
- **Direct browser fetch** ✅ (works keyless; can add `?api_key=` for higher limits)
- **Refresh:** 15min
- **Render:** `<EonetLayer>` — `MapMarker` with category icon from EONET's `categories[].title` → emoji map (Wildfires 🔥, Volcanoes 🌋, Severe Storms 🌀, Sea and Lake Ice 🧊, etc.). Pane: `overlay-point-large`.
- **Maps to category:** category-dependent (Wildfires → environment, Volcanoes → natural-disaster, Storms → natural-disaster, …)
- **queryNearby:** EONET events have `geometry[]` (sometimes a track of points over time) — match if any geometry point is within radius/time
- **Attribution:** "NASA Earth Observatory"

### 4.5 NWS Active Alerts (US)
- **Hook:** `useNwsAlerts`
- **Source:** `https://api.weather.gov/alerts/active`
- **License:** US public domain
- **Backend proxy** ❌→✅ (must set `User-Agent: GroundTruth/1.0 (contact@groundtruth.grm.wtf)` header — bare browser fetch can 403)
- **Hono route:** `app.get("/feeds/nws-alerts", ...)` with 60s in-process cache
- **Refresh (client):** 60s
- **Render:** `<NwsAlertsLayer>` — `MapPolygon` per feature, fill color by severity (`Extreme` red, `Severe` orange, `Moderate` yellow, `Minor` blue). Pane: `overlay-polygon`.
- **Maps to category:** `natural-disaster`
- **queryNearby:** polygon contains-point on alert geometry
- **Attribution:** "NWS / NOAA"

### 4.6 NASA GIBS (base layer toggle)
- **Hook:** none (URL is computed once per day)
- **Source:** `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/{TIME}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`
- **License:** US public domain
- **Direct browser fetch** ✅
- **Refresh:** never (daily layer; recompute URL once per page mount)
- **Render:** `<MapTileLayer name="NASA GIBS (yesterday true color)" url={...} />` — added to the existing layer toggle next to "Default" and "Satellite"
- **Maps to category:** N/A (base layer, not events)
- **queryNearby:** N/A (base layer)
- **Note:** show *yesterday's* date, not today's — today's pass may not be processed yet

### 4.7 RainViewer animated radar
- **Hook:** `useRainViewerManifest`
- **Source:** `https://api.rainviewer.com/public/weather-maps.json` returns a manifest of timestamped radar tile URLs (past 2h, future 30 min)
- **License:** free, attribution required
- **Direct browser fetch** ✅
- **Refresh:** 10min
- **Render:** `<RainViewerLayer>` — for now, render only the **most recent** radar frame as a single `MapTileLayer` with `pane: overlay-raster`. Animation deferred to Phase D (would require preloading multiple frames + crossfade).
- **Maps to category:** N/A
- **queryNearby:** N/A (raster, not features)
- **Attribution:** "RainViewer.com"

### 4.8 NASA FIRMS wildfires
- **Hook:** `useFirms`
- **Source:** `https://firms.modaps.eosdis.nasa.gov/api/area/csv/{MAP_KEY}/VIIRS_NOAA20_NRT/world/1` (last 1 day, world bbox)
- **License:** NASA open, MAP_KEY embeddable but better via backend
- **Backend proxy** ✅ — Hono route at `/feeds/firms` parses CSV → GeoJSON, filters by `confidence >= 50` and `type == 0` (vegetation fire, not flares/industrial), caches 5 min
- **Refresh (client):** 5min
- **Render:** `<FirmsLayer>` — `MapMarkerClusterGroup` with `MapCircleMarker` per hot pixel. ~thousands of features globally; clustering is mandatory. Pane: `overlay-point-small`.
- **Maps to category:** `environment` (or `natural-disaster` if you prefer)
- **queryNearby:** haversine, no time filter (FIRMS is always last 24h)
- **MAP_KEY:** new env var `FIRMS_MAP_KEY` (free signup at firms.modaps.eosdis.nasa.gov/api/map_key)

### 4.9 Smithsonian GVP volcanoes
- **Hook:** `useGvp`
- **Source:** `https://volcano.si.edu/database/webservices.cfm` — WFS endpoint returns Holocene volcanoes + weekly activity report
- **License:** Smithsonian open
- **Direct browser fetch** ✅ (WFS returns GeoJSON)
- **Refresh:** 24h (weekly report changes weekly; daily report Mon-Fri)
- **Render:** `<GvpLayer>` — `MapMarker` with 🌋 emoji icon, color by alert level (Normal/Advisory/Watch/Warning). Pane: `overlay-point-large`.
- **Maps to category:** `natural-disaster`
- **queryNearby:** haversine on `geometry`

### 4.10 OpenAQ air quality
- **Hook:** `useOpenAq`
- **Source:** `https://api.openaq.org/v3/...`
- **License:** CC BY 4.0
- **Backend proxy** ✅ — `OPENAQ_API_KEY` env var, route `/feeds/openaq` queries latest measurements globally for a small set of pollutants (PM2.5, PM10, NO2). 30min cache.
- **Refresh (client):** 30min
- **Render:** `<OpenAqLayer>` — `MapCircleMarker` per station, color by AQI band (green→hazardous purple). Pane: `overlay-point-small`.
- **Maps to category:** `environment`
- **queryNearby:** haversine on station coords

### 4.11 ReliefWeb humanitarian
- **Hook:** `useReliefWeb`
- **Source:** `https://api.reliefweb.int/v1/disasters?profile=full&filter[field]=status&filter[value]=alert` (paginated)
- **License:** open, no auth
- **Backend proxy** ✅ — 1k req/day per IP, so backend cache shares across users. 30min TTL.
- **Refresh (client):** 30min
- **Render:** `<ReliefWebLayer>` — `MapMarker` per disaster (most have country-level coords). Pane: `overlay-point-large`.
- **Maps to category:** based on `type`: drought → environment, epidemic → health, complex emergency → conflict, …
- **queryNearby:** haversine, broader radius (500km) since ReliefWeb is country-coarse

### 4.12 Cloudflare Radar internet outages
- **Hook:** `useCloudflareRadar`
- **Source:** `https://api.cloudflare.com/client/v4/radar/...` — outage detection endpoints
- **License:** Cloudflare Radar terms (CC BY-NC for non-commercial display with attribution)
- **Backend proxy** ✅ — `CLOUDFLARE_API_TOKEN` env var, route `/feeds/cloudflare-radar`. 5min cache.
- **Refresh (client):** 5min
- **Render:** `<CloudflareRadarLayer>` — `MapMarker` placed at country centroid for each active outage. Pulsing red dot. Pane: `overlay-point-large`.
- **Maps to category:** `technology`
- **queryNearby:** country-level match (find which country contains the event coord, see if there's an active outage)

### 4.13 CISA KEV — special handling (no map render)
- **Hook:** `useCisaKev`
- **Source:** `https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json`
- **License:** US PD
- **Direct browser fetch** ✅
- **No map render** — CVEs have no native geo. Skip from Phase A overlay layers.
- **Where it goes:** the Find Related Context panel can show "X new CISA KEV entries this week" as a global non-geo card when the event is `category == 'technology'`. Defer the actual rendering to Phase A5.

### 4.14 CelesTrak satellites (client-side compute)
- **Hook:** `useSatellites`
- **Source:** `https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle` (and a few other groups: weather, gnss, science)
- **License:** free public
- **Direct browser fetch** ✅ for TLEs; **all propagation client-side**
- **New deps:** `satellite.js` (TLE → SGP4 → ECEF → lat/lng), `Leaflet.Geodesic` (antimeridian-aware polylines)
- **Refresh:** TLEs once per page mount (TLEs valid for ~6 hours); ground tracks recomputed every 5s in a `requestAnimationFrame` loop
- **Render:** `<SatelliteLayer>` — limit to ~20 popular sats (ISS, CSS Tiangong, Hubble, a few NOAA weather sats, a few Starlink representatives). For each: a `MapCircleMarker` at the current sub-satellite point + a `Leaflet.Geodesic` polyline showing the previous + next ~30 min of ground track. Pane: `overlay-line` for tracks, `overlay-point-large` for sub-points.
- **Maps to category:** N/A
- **queryNearby:** "Is any tracked satellite passing overhead in the next hour?" — not exposed in Find Related yet (defer to a "satellite passes" specific tool)
- **Performance:** ~20 polylines + 20 markers + 1 RAF loop. Trivial.

---

## 5. Phased implementation breakdown

### Phase A1 — Plumbing (foundation)

Files to create:
- `groundtruth/src/hooks/use-overlay-layers.ts` — URL-state hook with `?layers=` nuqs parser
- `groundtruth/src/lib/layer-presets.ts` — preset dictionary
- `groundtruth/src/components/map/layer-status-pill.tsx` — freshness pill
- `groundtruth/src/components/map/overlays/overlay-layers.tsx` — wrapper component that creates custom panes on mount and renders all enabled layers
- `groundtruth/src/components/map/overlays/overlay-panel.tsx` — extends the existing `MapLayersControl` with preset buttons + per-layer rows + freshness pills
- `groundtruth/src/lib/feeds/types.ts` — shared types: `OverlayItem`, `RelatedContext`, `LayerStatus`

Files to modify:
- `groundtruth/src/components/map/world-map.tsx` — insert `<OverlayLayers />` between `<CountryChoropleth />` and `<EventMarkers />` (around line 205)

No new dependencies. No new env vars.

### Phase A2 — Browser-direct overlay layers

For each of these, create one hook file under `src/hooks/feeds/` and one layer component under `src/components/map/overlays/`:

1. USGS earthquakes → `use-usgs-earthquakes.ts` + `usgs-earthquake-layer.tsx`
2. GDACS → `use-gdacs.ts` + `gdacs-layer.tsx`
3. NHC storms → `use-nhc-storms.ts` + `nhc-storms-layer.tsx`
4. NASA EONET → `use-eonet.ts` + `eonet-layer.tsx`
5. Smithsonian GVP → `use-gvp.ts` + `gvp-layer.tsx`

Each follows the same shape as `country-choropleth.tsx`. Each registers its `queryNearby` in the composite `useFindRelated` hook.

### Phase A3 — Tile / raster overlays

6. NASA GIBS — add a `<MapTileLayer>` to the existing layer toggle in `world-map.tsx` (the `MapLayers` block at line 196). One line.
7. RainViewer — add `<RainViewerLayer>` that fetches the manifest, picks the latest frame, renders one tile layer in the `overlay-raster` pane.

### Phase A4 — Backend-proxied layers

Create `groundtruth/src/server/feeds/` directory:
- `feeds.app.ts` — Hono sub-app, mounted in `create-api.ts:67` with `app.route("/feeds", feedsApp)`
- `nws-alerts.route.ts` — proxy + 60s cache
- `firms.route.ts` — CSV → GeoJSON conversion + 5min cache (new env var `FIRMS_MAP_KEY`)
- `openaq.route.ts` — proxy + 30min cache (new env var `OPENAQ_API_KEY`)
- `reliefweb.route.ts` — proxy + 30min cache, no auth
- `cloudflare-radar.route.ts` — proxy + 5min cache (new env var `CLOUDFLARE_API_TOKEN`)

Then matching client hooks under `src/hooks/feeds/`:

8. NWS alerts → `use-nws-alerts.ts` + `nws-alerts-layer.tsx`
9. FIRMS → `use-firms.ts` + `firms-layer.tsx`
10. OpenAQ → `use-openaq.ts` + `openaq-layer.tsx`
11. ReliefWeb → `use-reliefweb.ts` + `reliefweb-layer.tsx`
12. Cloudflare Radar → `use-cloudflare-radar.ts` + `cloudflare-radar-layer.tsx`

New env vars (add to `groundtruth/src/env.ts` and `.env.example`):
- `FIRMS_MAP_KEY` — server, free
- `OPENAQ_API_KEY` — server, free
- `CLOUDFLARE_API_TOKEN` — server, free with Cloudflare account

### Phase A5 — Find Related Context UI

Files to create:
- `groundtruth/src/hooks/use-find-related.ts` — composite hook fanning out to every layer hook
- `groundtruth/src/components/map/related-context.tsx` — section component rendering the result

Files to modify:
- `groundtruth/src/components/map/event-detail-panel.tsx` — insert `<RelatedContext event={event} />` between the event details block and the chat section (around line 293, just before the `border-t` chat section)

Behavior:
- Section is collapsed by default with a chevron and a count: "Related context · 5 nearby items"
- Expand → group by layer source: "USGS · 2 quakes (M3.1, M2.8)", "FIRMS · 1 hot pixel 18km away", "RainViewer · light precipitation overhead"
- Each row is clickable and triggers a `flyTo` on the map

Performance: `useFindRelated` only runs when an event is selected (via `enabled` flag), and only enabled overlay hooks contribute. No wasted queries.

### Phase A6 — Polish

- Layer panel UX: presets row at top, then collapsible groups (Weather, Disasters, Tech, Imagery, Mobility), each row with toggle + freshness pill + info tooltip
- Per-layer attribution shown in a collapsed footer (legal requirement for several feeds)
- Loading skeletons while feeds initialize
- Toast notifications on persistent errors (`useEffect` watching `query.error`, like `use-events.ts:20` does)

---

## 6. Schema changes (Phase A: NONE)

Phase A does not touch the database schema. All overlay data is ephemeral browser state.

For Phase B (deferred), the following additive schema changes are anticipated:

```ts
// In src/server/db/schema/event/event.db.ts
export const worldEvent = pgTable("world_event", {
  // ...existing fields...
  upstreamSource: text("upstream_source"),    // "usgs" | "gdacs" | "firms" | ...
  upstreamId: text("upstream_id"),             // canonical ID from the source feed
  // ...
}, (table) => [
  // ...existing indexes...
  uniqueIndex("worldEvent_upstream_idx")
    .on(table.upstreamSource, table.upstreamId)
    .where(sql`${table.upstreamSource} IS NOT NULL`),
])
```

This lets monitor agents (Phase B) write idempotently — re-running the agent never duplicates rows. The unique index is partial so user-submitted events (where upstream is null) are unaffected.

**No migration needed in Phase A.** When Phase B begins, this is the first migration.

---

## 7. Phase B — Monitor agents (planned, deferred)

> **Status:** spec'd, not implemented. Build after Phase A is validated in production.

### Goal
Each Tier 1 overlay feed gets its own ENS-named agent that polls the same feed and submits *significant* items as canonical Ground Truth events. The agent has its own ERC-8004 identity, builds reputation as humans corroborate, and is subject to disputes.

### Architecture
- New package `groundtruth-monitor` (sibling to `groundtruth-mcp` in the monorepo)
- Generic monitor SDK that takes a feed-fetcher + significance-filter + de-dupe key, and uses the existing `groundtruth-mcp` package internally to submit via the existing `submit_event` flow
- One thin agent per feed:
  - `usgs-monitor` — submits M5.5+ quakes
  - `gdacs-monitor` — submits Red/Orange alerts
  - `firms-monitor` — submits high-confidence fire clusters (>10 hot pixels, >20km², lasting >2 hours)
  - `nws-monitor` — submits Tornado Warning + Hurricane Warning + Flash Flood Emergency
  - `nhc-monitor` — submits new storms when they reach Tropical Storm strength
  - `eonet-monitor` — submits new EONET events (NASA-curated, low-noise)
- Each agent has its own wallet + ENS subname (`usgs.groundtruth-monitors.eth` etc.) registered via the existing 4-tx flow
- All agents share the same monitor SDK; per-feed config is small

### Hosting
**Three options, no clear winner — defer the decision until Phase A is validated:**

| Option | Pros | Cons |
|---|---|---|
| **GitHub Actions cron** | Free, no infra, version-controlled | 5-min minimum interval, cold starts, secret management is OK |
| **Vercel Cron** | Same project, same env, easy | Hobby tier limits, 10s function limit (some agents may need longer) |
| **Railway** | Long-running, easy to scale, generous free tier | New service to maintain |

Recommendation: start with GitHub Actions for cost/simplicity. Migrate to Railway if any agent needs >10s execution or sub-5-min cadence.

### Schema prerequisite
The `upstreamSource` + `upstreamId` columns from §6 must land before Phase B starts.

### Reputation loop
- Agent submits event with `source = <upstream URL>`
- Human reporters in the area corroborate via the existing event flow
- Confidence score climbs (existing `src/lib/confidence.ts` already does this)
- Agent reputation grows (ERC-8004 reputation registry)
- If agent submits a false positive, humans dispute → reputation drops
- After N disputes, the monitor SDK can automatically pause submissions for that agent until reviewed

### Open question for Phase B
Should overlay layers visually distinguish *which* items have been "promoted" to canonical events? E.g., USGS overlay shows all M2.5+ quakes as small dots, but the M5.5+ ones the monitor submitted are also rendered as full Ground Truth event markers. **Recommendation:** yes — the visual story of "raw feed → curated event → human corroboration → climbing confidence" is the entire pitch.

---

## 8. Phase C — WebSocket + WebGL (planned, deferred — needs new infra)

### C1: Maritime Chokepoint Watch (AIS ships)
- AISStream.io provides a free WebSocket firehose, bbox-filterable
- WebSocket cannot run in the browser without exposing the API key
- **Requires sidecar service** — small Node/Bun process that subscribes to AISStream, filters for events of interest (vessel-dark detection, traffic delta in chokepoints), pushes structured updates to the Ground Truth API
- Hosting: Railway is the natural fit (long-running process, generous free tier)
- New table `vessel_position` (or just push as canonical events with `source: "aisstream"`)
- **Decide later** based on Phase A validation

### C2: Flight rendering (OpenSky / adsb.lol)
- Free flight feeds exist (OpenSky bbox queries, adsb.lol unfiltered)
- Rendering is the hard part: ~50K aircraft globally, DOM markers die at ~1K, canvas works to ~10K, WebGL is the only path past that
- Requires `Leaflet.PixiOverlay` (WebGL marker rendering) + dead-reckoning interpolation for smooth animation between updates
- Backend route: `/feeds/opensky?bbox=...` with credit-budget-aware caching
- **Estimated effort:** 3–5 days for usable performance + good UX
- **Alternative:** start with a "show flights in current viewport at low frequency" mode that polls OpenSky for the current map bbox every 10s — works without PixiOverlay because viewport bbox usually has <500 aircraft. Adequate for the demo.

### C3: Bluesky Jetstream social corroboration
- Free WebSocket firehose, bbox-impossible (no geo metadata)
- Same sidecar pattern as AISStream: subscribe in a worker, filter by keyword + cross-reference with active Ground Truth events
- Output: pushes corroboration messages into the existing chat thread of matching events

---

## 9. Phase D — Nice-to-have (future)

- **Time-scrub slider** — replay events over the last 24h / 7d / 30d via shadcn `Slider` + React state. Roll your own, don't use a Leaflet plugin.
- **Layer opacity controls** — slider per layer, hidden behind a chevron in the layer row
- **Wind / current particle field** — `leaflet-velocity` plugin + NOAA GFS GRIB2 → JSON pipeline (cron service)
- **Mobile drawer for layer picker** — shadcn `Drawer` (Vaul) with snap points like Apple Maps
- **Animated RainViewer playback** — preload all 12 frames, crossfade on tick
- **Embeddable widget** — `<iframe>` mode with predetermined layers + bbox, for news sites to embed
- **Per-layer settings** — magnitude threshold for USGS, alert level for GDACS, confidence threshold for FIRMS

---

## 10. Critical files for implementation

| File | Role |
|---|---|
| `groundtruth/src/components/map/world-map.tsx:181` | Insert `<OverlayLayers />` here |
| `groundtruth/src/components/map/country-choropleth.tsx:144` | Template for polygon layer with custom pane |
| `groundtruth/src/components/map/event-markers.tsx:25` | Template for clustered marker layer |
| `groundtruth/src/components/map/event-detail-panel.tsx:293` | Insert `<RelatedContext />` before the chat section |
| `groundtruth/src/components/ui/map.tsx` | Existing wrappers (`MapPane`, `MapGeoJSON`, `MapPolygon`, `MapPolyline`, `MapCircleMarker`, `MapMarkerClusterGroup`, `MapTileLayer`) — no changes needed |
| `groundtruth/src/hooks/use-events.ts:8` | React Query polling pattern to mirror |
| `groundtruth/src/hooks/use-event-filters.ts:16` | nuqs URL state pattern to mirror |
| `groundtruth/src/server/create-api.ts:67` | Mount new `/feeds` Hono sub-app here |
| `groundtruth/src/env.ts` | Add `FIRMS_MAP_KEY`, `OPENAQ_API_KEY`, `CLOUDFLARE_API_TOKEN` |
| `groundtruth/.env.example` | Mirror the new env vars |
| `groundtruth/src/lib/event-categories.ts` | Reference for category → color mapping (overlay markers should derive from these) |

---

## 11. Verification (after Phase A ships)

Local:
1. `bun run dev`, open http://localhost:3000
2. Toggle "Disasters" preset → confirm USGS quakes, GDACS, NHC, FIRMS, NWS, RainViewer all appear within their refresh windows
3. Use Network tab to confirm: USGS calls fire to upstream directly, NWS/FIRMS/OpenAQ/ReliefWeb/Cloudflare Radar fire to `/api/feeds/*`
4. Click any user-reported event → confirm "Related context" section populates with hits from active layers
5. Use the layer panel to toggle individual layers, confirm freshness pills update
6. Disable all layers → confirm no background fetches in Network tab (visibility-aware polling working)
7. Refresh with `?layers=usgs,firms` in URL → confirm those two layers come back active
8. Run `bun run typecheck` → expect zero errors (per the user's rule, I won't run this until asked)
9. Run `bun run lint` → expect zero errors (same)

Production:
1. Deploy
2. Visit `https://groundtruth.grm.wtf?layers=usgs,gdacs,nhc,firms,nws,rainviewer`
3. Verify smart-wallet SIWE login still works (regression check)
4. Use Chrome MCP browser tools to take a screenshot of the Disasters preset rendered live
5. Click an event → confirm Related Context populates from production data
6. Wait for a USGS earthquake to occur, confirm it appears within ~60s

---

## 12. Open questions — RESOLVED

All blocking questions resolved on 2026-04-07. See §0 "Locked scope for first PR" for the locked decisions.

---

## 13. What this plan deliberately does NOT include

- Code. This is a spec, not an implementation. Per `feedback_spec_before_code.md`, the user wants the spec finalized first.
- Diagrams. The architecture is small enough to describe in prose. Add Mermaid later if useful.
- Time estimates. Per the user's CLAUDE.md, complexity not time.
- Anything that requires new infrastructure (sidecar, cron, queue) — those are explicitly Phase B/C and require separate scoped specs.
- Schema migrations — the existing schema is sufficient for everything in Phase A.
- Changes to the existing event model, sidebar, or chat. Overlays are purely additive.

---

## 14. Complexity summary

| Phase | Items | New deps | New env vars | New tables | Schema migrations | New services |
|---|---|---|---|---|---|---|
| **A1** Plumbing | 6 files | none | none | 0 | 0 | none |
| **A2** Browser-direct (5 feeds) | 10 files | none | none | 0 | 0 | none |
| **A3** Tile feeds (2) | 1 file + 1 line | none | none | 0 | 0 | none |
| **A4** Backend-proxied (5 feeds) | 10 files | none | 3 | 0 | 0 | none |
| **A5** Find Related Context | 2 files + 1 edit | none | none | 0 | 0 | none |
| **A6** Polish | edits | none | none | 0 | 0 | none |
| **A (satellites)** CelesTrak | 2 files | satellite.js, Leaflet.Geodesic | none | 0 | 0 | none |
| **B** Monitor agents | new package | groundtruth-mcp internally | per-agent wallets | 0 | 1 (upstream cols) | 1 (cron host) |
| **C1** AIS ships | new package | aisstream sdk | API key | maybe | maybe | 1 (Railway worker) |
| **C2** Flight rendering | 3 files | Leaflet.PixiOverlay, pixi.js | none (or OpenSky key) | 0 | 0 | none |
| **C3** Bluesky social | new package | bluesky api client | none | 0 | 0 | 1 (Railway worker) |
| **D** Nice-to-have | varies | varies | varies | 0 | 0 | varies |

Phase A is **strictly additive** — no schema migrations, no new services, no breaking changes to existing components, no risk to the deployed app. It only adds files and edits 3 existing files (`world-map.tsx`, `event-detail-panel.tsx`, `create-api.ts`, plus `env.ts` and `.env.example` for Phase A4).

---

## 15. Final file-by-file build list (this PR)

**New files (28 files):**

`groundtruth/src/lib/feeds/`
- `types.ts` — `LayerId` const tuple, `OverlayItem`, `RelatedItem`, `LayerStatus`, `LayerMeta` types
- `layer-presets.ts` — `LAYER_PRESETS` dict (`off`, `disasters`, `satellite`, `humanitarian`, `everything`)
- `geo.ts` — `haversineKm`, `pointInBbox`, time-window helpers (small math utilities used by every queryNearby)

`groundtruth/src/hooks/feeds/`
- `use-usgs-earthquakes.ts`
- `use-gdacs.ts`
- `use-nhc-storms.ts`
- `use-eonet.ts`
- `use-gvp.ts`
- `use-rainviewer.ts`
- `use-satellites.ts`
- `use-find-related.ts` — composite hook fanning out to all layer hooks

`groundtruth/src/hooks/`
- `use-overlay-layers.ts` — nuqs URL state for `?layers=`

`groundtruth/src/components/map/overlays/`
- `overlay-layers.tsx` — wrapper that creates custom panes on mount and renders all enabled layers
- `usgs-earthquake-layer.tsx`
- `gdacs-layer.tsx`
- `nhc-storms-layer.tsx`
- `eonet-layer.tsx`
- `gvp-layer.tsx`
- `rainviewer-layer.tsx`
- `satellite-layer.tsx`
- `gibs-tile-layer.tsx` — small wrapper that computes the daily TIME param

`groundtruth/src/components/map/`
- `layer-status-pill.tsx` — `live / stale / down / loading` pill with relative time
- `layers-popover.tsx` — the new "Layers" button + popover containing presets + layer rows
- `related-context.tsx` — section component for `EventDetailPanel`

**Modified files (3 files):**
- `groundtruth/src/components/map/world-map.tsx` — insert `<OverlayLayers />` between `<CountryChoropleth />` and `<EventMarkers />`; replace bottom-right `MapLayersControl` with the new `<LayersPopover />`; add the NASA GIBS tile layer to the existing `MapLayers` block as a third base option
- `groundtruth/src/components/map/event-detail-panel.tsx` — insert `<RelatedContext event={event} />` between event details and chat section (around line 293)
- `groundtruth/package.json` — add `satellite.js` and `leaflet.geodesic` (+ types)

**Untouched (explicitly):**
- Database schema, migrations, env.ts, .env.example, all existing event/chat/auth/agent code, oRPC routers, MCP server, Remotion video.

**Total:** 28 new files + 3 file edits + 2 dep additions. Self-contained PR. Per the user's `>15 files = ask first` rule, will surface this list before any commits/push.

---

## 16. Verification checklist (after implementation)

- [ ] `bun run dev` boots without errors
- [ ] No type errors (only run `bun run typecheck` when explicitly asked)
- [ ] Map loads, base layers + choropleth + events still render exactly as before (regression check)
- [ ] New "Layers" button visible on right edge of map
- [ ] Click Layers button → popover opens with presets + layer rows
- [ ] Click "Disasters" preset → USGS, GDACS, NHC, EONET appear within their refresh windows
- [ ] Each visible layer shows a freshness pill that transitions `loading → live → stale` correctly
- [ ] Toggle individual layers on/off → URL updates to `?layers=...`
- [ ] Refresh page with `?layers=usgs,gdacs` → those two layers come back active
- [ ] Click any user-reported event → `EventDetailPanel` opens, "Related context" section visible with count
- [ ] Expand Related Context → shows hits grouped by source with relative time + distance
- [ ] Disable a layer → its data stops appearing in Related Context within next refetch
- [ ] Hover over an overlay marker → tooltip shows source-appropriate info, but click does nothing
- [ ] Click on a Ground Truth event marker that overlaps an overlay marker → event panel still opens (event always wins)
- [ ] Open layer panel on mobile (narrow viewport) → popover is usable, doesn't eat the whole screen
- [ ] After switching tabs away and back → polling resumes only for active layers
- [ ] Disable all layers → no background fetches in Network tab
- [ ] NASA GIBS base layer toggle works alongside existing Default / Satellite tile layers
- [ ] Satellites: ISS visible with ground track, position updates smoothly via RAF loop
- [ ] No visible errors in browser console
- [ ] Existing SIWE login (incl. embedded smart wallet) still works (regression check on the recent fixes)
