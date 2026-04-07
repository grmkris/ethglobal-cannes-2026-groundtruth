# Map Overlays & Agent Ops — Brainstorm

Research synthesis for adding live data overlays + agent operations to Ground Truth. Compiled 2026-04-07 from research across aviation/maritime/satellite/weather/event/OSINT feeds + Leaflet rendering patterns + crisis-map prior art (FlightRadar24, Windy, ZoomEarth, Liveuamap, DeepStateMap, afetharita.com).

> **Framing:** events are the product, overlays are corroboration. The killer pattern is "**Find related context**" — click an event, get matching context from every active overlay. Overlays exist to verify events, not decorate the map.

---

## Tier 1 — Drop-in feeds (no auth, no CORS pain, PRE-GEO, ~hours of work each)

These are GeoJSON or GeoJSON-able feeds you can fetch directly from the browser with React Query. No backend, no Worker, no key management.

| Feed | URL | Format | License | Refresh | Why it's perfect |
|---|---|---|---|---|---|
| **USGS Earthquakes** | `earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson` | GeoJSON | US public domain | 1 min | Authoritative, real-time, zero auth, drops straight into Leaflet. Maps cleanly to Ground Truth event schema (severity = log magnitude). |
| **GDACS** | `gdacs.org/gdacsapi/api/events/geteventlist/SEARCH` | GeoJSON / GeoRSS | CC BY 4.0 | 6 min | Multi-hazard (quake/cyclone/flood/volcano/wildfire) with severity scoring (Green/Orange/Red). UN-OCHA + EU JRC. |
| **NHC Active Storms** | `nhc.noaa.gov/CurrentStorms.json` | JSON + GeoJSON cones | US public domain | 3–6 hr (per advisory) | Atlantic/E-Pacific tropical cyclones with track + cone polygons. What CNN/NYT use. |
| **NASA EONET** | `eonet.gsfc.nasa.gov/api/v3/events` | GeoJSON | NASA open | hours | Curated 13-category feed (wildfires, volcanoes, severe storms, sea ice, dust). NASA-vetted dedupe. |
| **NWS Active Alerts** | `api.weather.gov/alerts/active` | GeoJSON polygons | US public domain | continuous | Tornado/hurricane/severe-storm warnings as polygons, US-only but every alert is ground truth. (Requires `User-Agent` header.) |
| **CISA KEV** | `cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json` | JSON | US public domain | weekdays | Known-exploited CVEs. NEEDS-GEO via vendor HQ (or skip geo and use as a "Tech" event source). |
| **Cloudflare Radar** | `developers.cloudflare.com/radar/` | REST JSON | CC BY-NC, free w/ token | real-time | Internet outages, BGP anomalies, country-tagged. Killer for "Internet Shutdown Sentinel" agent. |
| **Smithsonian GVP** | `volcano.si.edu/database/webservices.cfm` | GeoJSON / WFS | open | weekly + daily | Volcanoes of the World + weekly activity. PRE-GEO. |

**Visual base layers** (drop-in tile URLs, zero plumbing):
- **NASA GIBS WMTS** — `gibs.earthdata.nasa.gov/wmts/...` — true color daily MODIS, fire/smoke layers. Public domain. Use as alternate base map.
- **RainViewer** — past 2 hours of global radar in 10-min frames, no key. JSON manifest of timestamped tile URLs. Free.

---

## Tier 2 — Moving objects (need rendering work but doable)

These need either a Worker proxy or custom rendering (PixiOverlay) for performance.

| Feed | License | Notes |
|---|---|---|
| **OpenSky Network** (flights) | CC BY-NC | Free, credit-based (4K/day authed). REST JSON. NC clause is the gotcha for a commercial map — `adsb.lol` is the ODbL alternative if you want to be truly commercial-clean. |
| **adsb.lol** (flights) | ODbL | Fully free incl. commercial. 1 req/sec polite cap. Smaller coverage than OpenSky in some regions. |
| **AISStream.io** (ships) | Free, key required | **WebSocket** firehose with bbox subscription. The free maritime feed everyone should use. Needs a sidecar service since the WS connection is backend-only. |
| **CelesTrak TLEs + satellite-js** (satellites) | Public | All client-side: fetch TLEs, propagate with `satellite-js`, render ground tracks with `Leaflet.Geodesic` (handles antimeridian). No API after first TLE fetch. |
| **NASA FIRMS** (fires) | Free w/ MAP_KEY | Near real-time wildfire detections (3hr globally). CSV → GeoJSON conversion needed. |

**Rendering bottleneck:** DOM markers die at ~1–2K. Canvas works to ~10K. Past that you need WebGL. For Ground Truth this means:
- Earthquakes / fires / cyclones / static overlays → plain `L.geoJSON` is fine
- Flights / ships → needs `Leaflet.PixiOverlay` (WebGL) or risk a janky map
- The trick everyone misses: **interpolate + dead-reckon** between updates so things move smoothly between 2–10s polls

---

## Tier 3 — Composite intelligence agents (ambitious but the real story)

These are MCP-driven agents that combine multiple feeds and submit verified events to Ground Truth. **Each one is a single MCP server you can run via cron**, exercising the project's "any agent can connect" thesis directly.

| Agent | Sources | What it does | Reputation story |
|---|---|---|---|
| **Quake-and-corroborate** | USGS → GDELT GEO → Bluesky Jetstream → ReliefWeb | Submits new M5.5+ events, monitors social mentions in radius for the next 2h, files corroboration messages. | Reputation grows when later sitreps from UN/Red Cross confirm. |
| **Wildfire Watch** | NASA FIRMS + GDELT keywords + Carbon Mapper | Clusters new hot pixels in a region, files "wildfire" events with confidence from cluster size + duration. Auto-resolves when fires clear. | Demonstrates corroboration loop. |
| **Conflict Triangulation** | ACLED weekly + UCDP candidate + GDELT live + OpenSky military traffic | High-confidence conflict events with multi-source citations. The OSINT showcase. | The "Bellingcat as a service" agent. |
| **Internet Shutdown Sentinel** | Cloudflare Radar + IODA + Bluesky/Mastodon mentions | Detects sudden internet outages, files "Country X disruption" as Tech events. | Cross-validation across 3 sources = high confidence. |
| **Maritime Chokepoint Watch** | AISStream bbox subscription | Watches Hormuz / Suez / Bosporus / Taiwan Strait. Detects AIS-off events (vessel goes dark) and traffic delta drops. | Maritime OSINT — the kind of work that gets cited in NYT investigations. |
| **Volcano Sentinel** | Smithsonian GVP + USGS HANS + GDACS | Daily volcano activity → events near volcano coords with VAAC color codes. | Niche but authoritative. |
| **Outbreak Tracker** | WHO DON + ECDC CDTR + FAO EMPRES-i+ | Weekly poll → submits health events with WHO grade as severity. | "WHO authoritative" credentials baked in. |
| **Election Pulse** | IFES ElectionGuide + ACLED protest density T-30d + GDELT sentiment | Auto-generates election events with risk score. | Story-driven; great for "agent that watches the future". |
| **Refugee Flow Detector** | UNHCR Refugee Stats + ReliefWeb displacement + ACLED conflict in origin | Files displacement events with magnitude. | Crosses health, conflict, social. |
| **Methane Super-Emitter** | Carbon Mapper + Climate TRACE + GFW deforestation | Files environment events with corporate operator attribution. | Aligns with "verified, attributed" pitch perfectly. |

---

## Architecture decisions (recurring across all options)

1. **Polling, not Socket.io** — already a project rule. React Query + per-feed refetch interval. Backend caches one fetch per upstream API and serves slices to clients.
2. **Direct browser → upstream** for CORS-friendly free feeds (USGS, GDACS, NWS, RainViewer, FIRMS-with-public-MAP_KEY).
3. **Cloudflare Worker proxy** for paid APIs and feeds where the key must stay secret (OpenWeatherMap paid, FlightAware, AISStream WebSocket).
4. **Three custom Leaflet panes** (`pane-context`, `pane-overlay`, `pane-events`) with explicit z-index so events always sit above overlays. Created via `map.createPane(...)`.
5. **Layer presets > flat layer toggles** — Windy got murdered in their own forum for redesigning the picker. Default to curated combos: "Disasters", "Conflict", "Maritime", "Just events". Users pick a story, not 50 toggles.
6. **Per-layer freshness pill** in the legend — "Live", "Stale 47s", "Down". Differentiator vs every other map that has one global freshness indicator that lies.
7. **`Leaflet.PixiOverlay`** is the only sane path to >5K moving markers in Leaflet. Demos go to 1M markers. Wrap it in a one-shot `useEffect`.
8. **`Leaflet.Geodesic` + `satellite-js`** for satellite ground tracks (handles antimeridian, true great-circle arcs).
9. **`leaflet-velocity`** for wind/current vector fields (works with NOAA GFS GRIB2 → JSON).
10. **Time-aware playback**: roll your own with shadcn `Slider` + React state, not a Leaflet plugin. Plugins fight React.

---

## What to build first (recommendation tree)

**If you want the smallest, narratively richest first step → USGS Earthquakes overlay + "Find related context" feature.** ~5 files, ~400 lines, no new dependencies. Direct browser fetch. Drops into your existing event pipeline. Demo story: "USGS reported a M5.2 here 4 min ago, three of our human reporters in the area already submitted corroborating damage reports — confidence: 97%." That's the entire pitch, in one click.

**If you want the strongest agent narrative → GDACS multi-hazard MCP agent.** Single MCP tool (`monitor_gdacs`) that polls the GeoRSS feed and posts new Red/Orange alerts as Ground Truth events using the existing `submit_event` infrastructure. Run as a cron. Reuses the published `groundtruth-mcp` package; no app changes. The "agent on Ground Truth" thesis becomes literal — a reference agent anyone can fork.

**If you want the biggest visual impact → 3 overlays at once with a presets system.** USGS quakes + NASA FIRMS fires + RainViewer radar + a "Disasters" preset button. One day of work for all three, because they share the layer-pane plumbing. Big visual difference; modest code.

**If you want the highest hackathon-judge wow factor → Maritime Chokepoint Watch.** AISStream WebSocket sidecar service watching Hormuz/Suez/Bosporus/Taiwan Strait for vessel-dark events. The OSINT story is killer. But: requires a long-running sidecar (Cloudflare Worker or Railway service), not just a Vercel deploy. Higher operational burden.

---

## File-level integration points (existing code to extend)

Already in the repo and well-positioned to receive this:

- `groundtruth/src/components/map/world-map.tsx` — main map composition. New `<EarthquakeLayer />`, `<FireLayer />` etc. components plug in here.
- `groundtruth/src/components/map/country-choropleth.tsx` — closest existing template for a polygon overlay. Mirror its shape for new GeoJSON layers.
- `groundtruth/src/components/map/event-markers.tsx` — primary content. Reference for what "primary visual weight" looks like (size, halo). Don't let context layers visually compete.
- `groundtruth/src/components/map/event-detail-panel.tsx` — where the "Find related context" feature attaches. Add a `<RelatedContext event={event} />` section that queries each active overlay's `queryNearby(lat, lng, radiusKm, hours)` method.
- `groundtruth/src/components/ui/map.tsx` — shadcn-map registry's `MapLayers`/`MapLayersControl`/`MapTileLayer` wrappers. Layer-control extension goes here.
- `groundtruth/src/hooks/use-events.ts` — pattern to mirror for `useUsgsEarthquakes`, `useFirms`, etc. React Query polling at appropriate intervals.
- `groundtruth/src/lib/event-categories.ts` — extend with overlay-source markers (or keep overlays in a separate constant so they can't be confused with user-reported events).
- `groundtruth/src/server/db/schema/event/event.db.ts` — the `worldEvent` table already has `agentAddress`, `agentEnsName`, `source`. Overlay-fed events from agents fit the existing schema with no migration.

For agent-side ops:
- `groundtruth-mcp/src/server.ts` — add new MCP tools like `monitor_gdacs`, `monitor_usgs`, `monitor_firms` that wrap the existing `submit_event` flow. Or build a separate `groundtruth-monitor-mcp` package per agent.
- `agent/CLAUDE.md` — extend with "if you're a monitor agent, here's the pattern: poll feed → dedupe by upstream ID → submit_event with source = upstream URL".

---

## What NOT to build (yet)

- **Twitter/X firehose** — paid only since 2023. Skip entirely. Use Bluesky Jetstream as the free social signal.
- **MarineTraffic / FlightRadar24 commercial APIs** — enterprise pricing. Use OpenSky/adsb.lol/AISStream instead.
- **ProMED** — RSS closed in 2023, paid only via samdesk.
- **ACLED commercial use** — registration is fine for free non-commercial, but the data has NC restrictions. Don't bake into a paid product without their license.
- **Custom tile pipeline (PMTiles, Tippecanoe)** — not needed until you have your own polygon data >50K features. Skip until then.
- **Self-hosted MapLibre** — only if you eventually need WebGL vector tiles for moving objects. Earthquakes + fires don't need it.

---

## Open questions for the user

1. **Scope discipline:** which ONE of the four "what to build first" options resonates? (per `feedback_scoped_plans.md` we plan one feature at a time)
2. **Agent vs overlay framing:** should the first new feature be an *overlay* (renders existing public data on the map) or an *agent* (autonomously posts to Ground Truth via MCP, with reputation on the line)? They're different demos.
3. **Sidecar tolerance:** are we OK adding a long-running worker process (Railway / Cloudflare Worker) to the deployment, or staying purely Vercel + Postgres? Some of the best feeds (AISStream, Bluesky Jetstream) are WebSocket-only.
4. **License posture:** if this is being positioned as a "public good" / non-commercial demo, the NC-licensed feeds (ACLED, OpenSky) are fine. If you ever want it commercial, switch to ODbL/CC0/public-domain feeds (adsb.lol, USGS, GDACS, Wikidata).
