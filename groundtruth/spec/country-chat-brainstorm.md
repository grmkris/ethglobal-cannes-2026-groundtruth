# Country Chat — Brainstorm

Companion to (eventually) `country-chat-implementation-plan.md`. Compiled 2026-04-07 after exploring per-country chat + claimable-regions ideas. This brainstorm covers **only** per-country chats. Claimable regions (Helldivers/Splatfest-style faction capture on ADM1 boundaries) is a separate, larger feature and will get its own brainstorm once the design questions in §11 are answered.

> **Framing:** chat already has a scope (`eventId`). "Country" is just a second scope that uses the same plumbing. The hard part isn't the schema — it's the cold-start (195 ghost rooms) and the selection UX. Don't over-engineer the data model; over-think the empty state.

---

## 1. The central problem: cold-start

The naive shape is "every country gets a chat room". 195 chats × ~0 daily messages each = 195 ghost rooms. This is how every "geographic chat app" since MapChat (2011) has died. The lesson from Reddit r/<country> and Discord regional servers: **rooms light up when content already lives there**. Don't *create* 195 empty rooms — let a country's chat *emerge* the first time something verifiable happens there.

Two concrete cold-start mitigations the design needs to support from day one:

1. **Pre-seed each country's chat with that country's events.** When a user opens "France chat", the top of the message list isn't empty — it shows the most recent verified events that happened in France, rendered as inline event cards (not as messages). The choropleth's existing point-in-polygon already produces `country → events` for free.
2. **Hide ghost rooms in the UI.** A country with 0 events AND 0 messages doesn't show as clickable on the map. Click does nothing (or shows a "No activity yet — be the first" affordance only on hover). This avoids the "I clicked Lesotho and got nothing" first impression.

The chat schema doesn't need to know about either of these. They're sidebar/UX concerns. But the design has to leave room for them.

---

## 2. Scope model — the key design decision

A chat message currently has exactly one scope discriminator: `eventId` (nullable). Adding country as a second scope forces a model decision. Four options considered:

| Model | How it works | Pros | Cons |
|---|---|---|---|
| **Strict scopes (mutually exclusive)** | Each message belongs to exactly one room: global, a country, or an event. CHECK constraint enforces it. | Trivial mental model. Matches current `eventId IS NULL` pattern. Pagination/index stays simple. | Cross-posting needs duplication. |
| **Hierarchical inheritance** | Event messages also appear in their country chat; country messages also appear in global. | "Global" feels alive (firehose of everything). | Filtering / unread counts get gnarly. Same message rendered N times = caching pain. |
| **Broadcast-up tags** | Country messages appear in global tagged `[FRA]`. | Global stays alive without duplication. | The filter logic is at query time, harder to index. |
| **Filter-down** | Global is the firehose; country and event are server-side filtered views over global. | Single source of truth. | Forces every message to have a country (point-in-polygon at write time). Tight coupling to event geo. |

**Recommendation: strict scopes (mutually exclusive).** Cleanest extension of what's already there. The hierarchical / broadcast-up models can be layered later as **read-side query options** without changing storage. A message lives in exactly one room. Global stays as `eventId IS NULL AND countryIso3 IS NULL`.

CHECK constraint:
```sql
CHECK (event_id IS NULL OR country_iso3 IS NULL)
```
i.e. at most one scope discriminator may be set. Both null = global.

---

## 3. Country identifier — ISO-A3, not a typeid

The choropleth at `groundtruth/src/components/map/country-choropleth.tsx:74` already keys countries by `feature.properties.ISO_A3` from `groundtruth/public/geo/ne_110m_admin_0_countries.geojson`. ISO 3166-1 alpha-3 (`USA`, `FRA`, `JPN`, etc.) is a stable external standard, not an internal entity, so:

- Storage: `varchar(3)` not a typeid. **No new typeid prefix.**
- Validation: zod `.string().length(3).regex(/^[A-Z]{3}$/)` — and (loosely) check it's a known code from a static list.
- Index: `(country_iso3, created_at DESC)` for pagination.

**Edge cases in Natural Earth ISO_A3:**
- `-99` → unrecognized / disputed (Kosovo, N. Cyprus, Somaliland, parts of Western Sahara). Treat as "no country chat". The land is still rendered by the choropleth but not selectable for chat.
- `ATA` (Antarctica) → real code, treat as a real country chat (it'll be funny and harmless).
- International waters / EEZs → not in `ne_110m_admin_0_countries`. Events here have no country chat, full stop. They still show in global.
- Contested codes (Taiwan = `TWN`, Crimea handled inside `RUS`/`UKR` polygons depending on dataset version). **Don't litigate borders.** Use whatever the GeoJSON says; if a user complains about Taiwan/Crimea, that's a data-source decision, not a feature decision.

Cross-border events: choropleth's point-in-polygon already picks one country deterministically. Reuse that helper so an event always maps to the same country. Don't try to handle "this event is in two countries". Pick one, move on.

---

## 4. Selection UX — three options, one winner

Where does country selection live?

| Option | Mechanism | Pros | Cons |
|---|---|---|---|
| **A. Third sidebar tab** | Add `"country"` to `SidebarTab` alongside `events` and `chat`. Tab has its own picker. | Discoverable. | Tab fatigue. Duplicates the chat tab — country chat *is* a chat. |
| **B. Scope dropdown inside Chat tab** | Header of the Chat tab becomes a dropdown: Global / United States / Earthquake near Lima. | All chats live in one tab, consistent. | Picker pollution. Dropdown of 195 countries is bad mobile UX. |
| **C. Selection-driven (recommended)** | Clicking a country on the choropleth sets `?country=USA`. The existing Chat tab header becomes "United States" with a × to clear. Same pattern as `?event=...` selection. | Reuses the existing event-selection mental model. URL-shareable. No new picker. Mobile-friendly. | First-time users may not realize countries are clickable — needs a one-time hover affordance. |

**Recommendation: C.** The Chat tab already changes scope when an event is selected (today it shows global, tomorrow it shows the country or event). One source of truth for "what room am I in":

```
priority: event > country > global
```

- `?event=wev_...` set → Chat tab shows that event's chat. Header: "Earthquake near Lima · ×"
- `?event` clear, `?country=FRA` set → Chat tab shows France chat. Header: "France · ×"
- Both clear → Global chat (today's behavior). Header: "Global Chat" (today's text)

Selecting an event takes precedence over a selected country (events are more specific). Clearing the event falls back to whatever country was selected, or global.

State lives in nuqs at `groundtruth/src/components/map/world-map.tsx:60-64`, alongside `selectedEventId` and `sidebarTab`. New parser: `parseAsCountryIso3` (string with regex validation, default null).

---

## 5. Choropleth becomes clickable

Today the choropleth at `country-choropleth.tsx:101-139` has hover/tooltip but **no click handler**. The change is small and self-contained:

```ts
// in onEachFeature, alongside the existing mouseover/mouseout
layer.on({
  click: (e: LeafletMouseEvent) => {
    L.DomEvent.stopPropagation(e)        // don't trigger map-click report mode
    onSelectCountry(iso, name)
  },
  // ...existing mouseover/mouseout
})
```

`onSelectCountry` is a new prop on `<CountryChoropleth>` provided by `world-map.tsx`, which calls `setSelectedCountryIso3(iso)` and `setSidebarCollapsed(false)` and `setSidebarTab("chat")`. Same pattern as `handleOpenChat` at `world-map.tsx:99-107`.

Selected country gets a visible style override (thicker border, slight glow) — extend `getCountryStyle` to take an `isSelected` flag. Don't redesign the choropleth colors.

**Click conflict with report mode:** report mode (`world-map.tsx:67`) is the "I'm placing a pin to file an event" state. While report mode is active, country click should NOT select the country — the user is trying to drop a pin. Gate the choropleth's click handler on `!reportMode` or pass through the click. Easier path: when `reportMode === true`, render the choropleth with `interactive: false` so the underlying map gets the click.

**Empty-country UX:** countries with `count === 0` AND no chat messages should NOT trigger the click handler at all. Reuse the `countryCounts` map already computed at `country-choropleth.tsx:60`. Phase 1 simplification: just gate on `count > 0` (events). Chat-message-count gating is a phase-2 optimization.

---

## 6. Schema extension

Single column added to `groundtruth/src/server/db/schema/chat/chat.db.ts:7`:

```ts
countryIso3: varchar("country_iso3", { length: 3 })
```

Plus a new index:

```ts
index("chat_message_country_created_idx").on(table.countryIso3, table.createdAt)
```

Plus a CHECK constraint (drizzle `check("...", sql`...`)`):

```ts
check(
  "chat_message_scope_exclusive",
  sql`event_id IS NULL OR country_iso3 IS NULL`
)
```

**That's the entire migration.** No data backfill — existing rows have both `event_id` and `country_iso3` null = "global", which is correct.

Per `~/.claude/CLAUDE.md` rules: **I propose this as a code diff, the user runs `bun run db:generate` only when ready.** No auto-migration.

---

## 7. API extension

Three small files touched on the server:

**`groundtruth/src/server/db/schema/chat/chat.zod.ts:4`** — extend response and input schemas:
```ts
chatMessageResponseSchema:
  + countryIso3: z.string().length(3).regex(/^[A-Z]{3}$/).nullable()

createChatMessageInputSchema:
  + countryIso3: z.string().length(3).regex(/^[A-Z]{3}$/).nullable().optional()
  + .refine(d => !(d.eventId && d.countryIso3), "scopes are mutually exclusive")
```

**`groundtruth/src/server/api/routers/chat.router.ts:7`** — add `countryIso3` to the `getMessages` input zod and pass through to the service. Same `.refine` for mutual exclusion.

**`groundtruth/src/server/services/chat.service.ts:33`** — extend the conditions builder:
```ts
if (params.eventId) {
  conditions.push(eq(chatMessage.eventId, params.eventId))
} else if (params.countryIso3) {
  conditions.push(eq(chatMessage.countryIso3, params.countryIso3))
} else {
  conditions.push(isNull(chatMessage.eventId))
  conditions.push(isNull(chatMessage.countryIso3))   // global = both null
}
```

Plus extend `create()` and `toResponse()` similarly.

**No new RPC procedures.** No new service. The existing `chat.getMessages` and `chat.send` already take a scope discriminator — we're adding a second discriminator value, not a new endpoint.

---

## 8. Frontend hook — discriminated union

`groundtruth/src/hooks/use-chat.ts:8` currently takes `eventId?: WorldEventId | null`. The clean extension is a discriminated union scope:

```ts
export type ChatScope =
  | { kind: "global" }
  | { kind: "event"; eventId: WorldEventId }
  | { kind: "country"; countryIso3: string }

export function useChat(scope: ChatScope, options?: { enabled?: boolean })
```

`queryKey` becomes:
```ts
["chat", "messages", scope.kind === "global"
  ? "global"
  : scope.kind === "event"
    ? scope.eventId
    : scope.countryIso3]
```

This isolates *all* "what room am I in?" logic in one place. Both call sites (`map-sidebar.tsx:196` global; `event-detail-panel.tsx` event) become more explicit. Easy migration.

A small helper `selectChatScope({ selectedEventId, selectedCountryIso3 })` lives next to the hook and encodes the priority `event > country > global` so consumers don't have to.

---

## 9. The pre-seeding play (the part that makes country chat not feel dead)

At the top of a country chat's message list, render an inline section: **"Recent events in France"** — the 5 most recent events whose `point-in-polygon` lands in `FRA`. Each rendered as a compact card (re-use `EventListItem` from `map-sidebar.tsx:56`), clickable to open the event detail.

This:
- **Costs zero new schema.** The data is already in `useEvents()`.
- **Solves the empty-room problem.** Every country with verified activity feels populated even before the first human message.
- **Aligns with the project thesis.** Events are the product. Country chat is conversation *about* the events in that country. The pre-seed makes the relationship explicit.
- **Requires one helper:** `eventsInCountry(events, iso)` — point-in-polygon over the cached `ne_110m` GeoJSON, same logic as the choropleth's `countryCounts`. Extract to `groundtruth/src/lib/geo/country-of.ts` so both choropleth and sidebar share it.

The pre-seed is the single most important UX choice in this whole feature. Without it, country chat is a worse Discord. With it, it's a contextual operations room.

---

## 10. Agent angle (free win)

The chat schema already supports agent attribution (`agentAddress`, `agentEnsName`, `worldIdVerified`). A monitor agent like the planned Phase B "Quake-and-corroborate" can post into a country's chat directly:

```
{ countryIso3: "JPN", content: "USGS reports M5.4, 47km off Honshu", agentAddress: 0x... }
```

This unlocks a real product story: **per-country agent feeds**. France chat surfaces French monitor agents' updates. Ukraine chat surfaces Ukraine OSINT agents' sitreps. Country = a Bloomberg terminal channel for an entire nation, populated by both humans and agents. The reputation system from `erc8004` already handles attribution.

**v1 doesn't need to ship any monitor agents.** This is just to confirm the schema doesn't paint us into a corner — and it doesn't. `agentAddress + countryIso3` Just Works.

---

## 11. Open questions for the user

1. **Scope priority** — confirm the `event > country > global` precedence in §4. Specifically: if an event is selected AND a country is selected, which chat does the Chat tab show?
2. **Empty countries** — do we want them clickable at all (with a "No activity yet" empty state) or fully non-interactive until they have ≥1 event? Recommendation: non-interactive until ≥1 event, to set a quality bar.
3. **Pre-seeded events count** — top-N inline cards in country chat. 5? 10? All recent in the last 48h? Recommendation: 5 most recent, with "View all in sidebar" link.
4. **Verified-only filter for country chats** — should country chats default to hiding unverified messages, or match global chat's behavior (show all)? Recommendation: match global. v1 keeps mod policy uniform across scopes.
5. **Mobile picker fallback** — clicking countries on mobile is fiddly. Do we also want a "Browse countries" search affordance somewhere (not a 195-row dropdown — a typeahead in the Chat tab header)? Defer to v2 unless user-tested poorly.
6. **Antarctica / disputed codes** — Antarctica chat: yes (it's funny). `-99` codes: no chat. Confirm.
7. **The claim-region feature** — should I write its brainstorm next, or let it bake? My read: bake. Country chat is a small, shippable slice that is *intrinsically* useful. The claim system depends on at least 6 design choices we haven't made (factions, what ownership confers, ADM1 data licensing, Sybil stake mechanism, season cadence, NFT-or-not). One feature at a time.

---

## 12. What to build first (recommendation tree)

**Smallest shippable slice** (~7 files, ~250 lines, no dependencies, no Phase A overlay-feeds conflicts):

1. Schema: add `countryIso3` column + index + check constraint to `chat.db.ts`. Generate migration (user runs `db:generate` only).
2. Zod: extend response + input schemas in `chat.zod.ts` with mutual-exclusion refine.
3. Service: extend `getMessages`/`create`/`toResponse` in `chat.service.ts`.
4. Router: extend input zod in `chat.router.ts`. (One-line change.)
5. Hook: refactor `useChat(eventId)` to `useChat(scope: ChatScope)` in `use-chat.ts`. Update both call sites.
6. Choropleth: add `onSelectCountry` prop + click handler in `country-choropleth.tsx`. Add `isSelected` style override.
7. World-map: nuqs `?country=` parser, state, scope priority resolution, prop wiring to choropleth and sidebar at `world-map.tsx:60-130`.
8. Sidebar: Chat tab header switches between "Global Chat" / country name / event title. `useChat` receives the resolved scope. `map-sidebar.tsx:196, 384-388`.
9. **Pre-seed (the killer detail):** inline events list at top of country chat. New small component `<CountryEventsHeader iso3=... />` rendered above the message list when `scope.kind === "country"`.

**Out of scope for v1 (explicitly deferred):**
- Unread counts per country
- "Browse all countries" picker
- Mod tools (mute country, pin message)
- Cross-room broadcast / hierarchical inheritance (§2 alternatives)
- Country chat list view (showing all active country chats sorted by activity)
- Country-level subscriptions / notifications
- ADM1 sub-country regions of any kind
- Faction / claim mechanics (separate brainstorm, see §11.7)

---

## 13. What NOT to build (yet)

- **A "country browser" sidebar tab.** The map *is* the country browser. Don't duplicate it.
- **Dropdown of 195 countries.** Selection is map-driven. Search-by-typing belongs in v2 only if v1 mobile UX bombs.
- **Per-country moderators / mod tools.** Same global rules apply. v1 is one mod policy.
- **Migrating existing global messages to country scope.** Global messages stay global. Backfill is unnecessary and would be lossy (we'd be guessing at intent).
- **A new typeid for countries.** ISO-A3 is a stable external standard. Don't wrap it.
- **A separate `chat_country` table.** Resist the urge. The whole point is that countries reuse the existing room concept, not introduce a parallel one.
- **WebSocket / real-time push.** Project rule: polling. The existing 3s `refetchInterval` at `use-chat.ts:23` carries over.
- **Translation / language detection per country.** France chat is not "the French-speaking chat", it's "the chat for events in France". Language is whatever users type. Defer i18n forever.

---

## 14. File-level integration points

| File | Current state | Change |
|---|---|---|
| `groundtruth/src/server/db/schema/chat/chat.db.ts:7` | `chatMessage` table with `eventId` (nullable) | Add `countryIso3 varchar(3)`, new index, new check constraint |
| `groundtruth/src/server/db/schema/chat/chat.zod.ts:4` | Response and input schemas | Add `countryIso3` field with regex; refine for mutual exclusion |
| `groundtruth/src/server/api/routers/chat.router.ts:7` | `getMessages` input | Extend zod to accept `countryIso3` |
| `groundtruth/src/server/services/chat.service.ts:33` | `getMessages` builds conditions on `eventId` only | Branch on `eventId` / `countryIso3` / global |
| `groundtruth/src/hooks/use-chat.ts:8` | `useChat(eventId)` | Refactor to `useChat(scope: ChatScope)` discriminated union |
| `groundtruth/src/components/map/country-choropleth.tsx:101` | `onEachFeature` has hover only | Add click handler; new `onSelectCountry` prop; selected style override |
| `groundtruth/src/components/map/world-map.tsx:60` | nuqs `?event=`, `?tab=` | Add `?country=`; resolve scope priority `event > country > global`; pass to choropleth + sidebar |
| `groundtruth/src/components/map/map-sidebar.tsx:196` | `useChat(null, ...)` and hardcoded "Global Chat" header | Receive scope from world-map; use it for `useChat(scope)`; dynamic header text + clear-× |
| `groundtruth/src/lib/nuqs-parsers.ts` | Has `parseAsWorldEventId` | Add `parseAsCountryIso3` (string + regex) |
| `groundtruth/src/lib/geo/country-of.ts` | **new** | Shared `pointToCountryIso3(events, geoJson)` helper extracted from choropleth — used by sidebar pre-seed |
| `groundtruth/src/components/map/country-events-header.tsx` | **new** | Inline 5-event preview rendered above message list when scope is country |

**File count: 9 modified + 2 new = 11.** Under the 15-file ask-first threshold from `~/.claude/CLAUDE.md`. Single PR is fine.

**Conflict check vs in-flight overlay-feeds PR (`spec/overlay-feeds-implementation-plan.md`):**
- `world-map.tsx` — overlay-feeds PR adds `<OverlayLayers>`, `<NasaGibsTileLayer>`, `<LayersPopover>` (already in HEAD). Country chat adds nuqs `?country=` and prop wiring. **Different lines, no conflict.** Order: ship overlay-feeds first, country chat rebases on top.
- `country-choropleth.tsx` — overlay-feeds doesn't touch this. **No conflict.**
- `chat.*` files — overlay-feeds doesn't touch chat. **No conflict.**
- `use-chat.ts` — overlay-feeds doesn't touch chat. **No conflict.**

Country chat can be developed in parallel and merged after the overlay-feeds PR lands.
