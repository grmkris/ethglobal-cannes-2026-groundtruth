# Country Chat — Implementation Plan

Companion to `country-chat-brainstorm.md`. The brainstorm is the menu and the design rationale; this is the build path.

> **Scope of this plan:** ship per-country chat as a clean extension of the existing chat scope model. No claim mechanics, no factions, no sub-country regions. Single PR. Country selection happens by clicking the existing choropleth.

---

## 0. Locked scope for first PR (this implementation)

After "go go go" on 2026-04-07, the scope of the **first PR is locked** to the items below. All open questions from `country-chat-brainstorm.md` §11 are answered with the recommended defaults unless explicitly overridden in the questions section here.

### In scope (this PR)

- **Schema**: nullable `country_iso3 varchar(3)` column on `chat_message`, plus `(country_iso3, created_at)` index, plus CHECK constraint `event_id IS NULL OR country_iso3 IS NULL` (strict mutually exclusive scopes — see brainstorm §2)
- **API**: extend `chat.getMessages` and `chat.send` zod inputs with `countryIso3`. No new procedures.
- **Service**: branch `getMessages` and `create` on the three scopes (event / country / global). `toResponse` surfaces `countryIso3`.
- **Hook**: refactor `useChat(eventId)` → `useChat(scope: ChatScope)` discriminated union. Export `ChatScope` type and `selectChatScope({ selectedEventId, selectedCountryIso3 })` helper.
- **State**: nuqs `?country=USA` parser with regex validation. Lives in `world-map.tsx` alongside `?event=` and `?tab=`.
- **Choropleth click**: countries become clickable when `count > 0` and `!reportMode`. Click sets `?country=ISO`, opens sidebar, switches Chat tab.
- **Sidebar**: Chat tab header is dynamic — "Global Chat" / country name (with × to clear) / event title (already exists implicitly via event detail panel).
- **Pre-seed**: when chat scope is country, render `<CountryEventsHeader iso3=... />` above the message list — top 5 most recent events whose centroid is in that country, as compact clickable cards. The killer detail from brainstorm §9.
- **Geo helper extraction**: pull point-in-polygon "which country contains this lat/lng?" out of `country-choropleth.tsx` into `lib/geo/country-of.ts`. Used by both choropleth and the new pre-seed.

### Out of scope (this PR — explicitly deferred)

- Sub-country regions (ADM1) of any kind
- Faction / claim / capture mechanics
- Country-level moderation tools (mute, pin, ban-from-country)
- Unread counts / notifications per country
- "Browse all countries" sidebar tab or typeahead
- Cross-room broadcast / hierarchical inheritance (brainstorm §2 alternatives)
- Migration of existing global messages to country scope
- Country-level subscriptions / push
- Per-country language detection or i18n
- Hiding empty countries based on chat-message count (only event count is checked in v1)

### Locked decisions (answers to brainstorm §11 open questions)

1. **Scope priority** — `event > country > global`. If both `?event=` and `?country=` are set in the URL, the event wins. The country chat is recovered when the user clears the event selection (× on the event detail panel). The Chat tab in the sidebar reflects whichever scope is currently "active" by this rule.
2. **Empty countries** — non-clickable until they have ≥1 event. No "be the first" empty state in v1. Sets a quality bar and avoids the "I clicked Lesotho and got nothing" first impression. Re-evaluate in v2 if users complain.
3. **Pre-seeded events count** — top 5 most recent events whose point-in-polygon lands in that country. No time-window filter (don't hide a country's only quake from last week). "View all events in [country]" link below if there are >5 — but v1 just shows 5, no link. Defer the link to v1.5.
4. **Verified-only filter for country chats** — match global. v1 keeps mod policy uniform across all chat scopes. The existing `worldIdVerified` badge surfaces per message; no scope-level filter.
5. **Mobile picker fallback** — none in v1. Country selection is purely map-driven. If mobile UX bombs, v2 adds a typeahead in the Chat tab header.
6. **Antarctica / disputed codes** — use whatever ISO_A3 the GeoJSON provides. Antarctica gets a chat (`ATA`). Codes equal to `-99` are unselectable (no chat). Don't litigate borders.
7. **Claim-region feature** — not in this PR. Bake until country chat ships.

### Locked technical decisions (no further questions)

- **Schema**: single nullable column. No new table. No new typeid prefix. No backfill. ISO-A3 stored as `varchar(3)`, validated by `/^[A-Z]{3}$/` regex.
- **CHECK constraint** — yes. Drizzle's `pgTable` second-arg accepts `check("name", sql\`...\`)`. Will be the first check constraint in this codebase.
- **Migration** — `bun run db:generate` is **NOT** auto-run. The user runs it explicitly per `~/.claude/CLAUDE.md`. SQL files are not hand-written.
- **Default Chat scope on first visit** = global. Existing behavior unchanged for current users.
- **URL parser** = `parseAsCountryIso3` in `lib/nuqs-parsers.ts`, regex-validated, default `null`.
- **Selection priority resolver** = `selectChatScope` colocated in `use-chat.ts`. Single source of truth for "what room am I in".
- **Hook signature change** is breaking. Both call sites updated in this PR. No backwards-compat shim.
- **Pre-seed click action** = sets `?event=...`. Reuses the existing event-selection mechanism — no new modal or panel.
- **Pre-seed cap** = `Math.min(5, eventsInCountry.length)`. No empty state if 0 (the country isn't clickable in the first place).
- **No new dependencies.** Everything uses existing libraries.
- **No new env vars.**
- **No new RPC procedures.**
- **Commit strategy** = single PR. 11 files (9 modified + 2 new). Under the 15-file ask-first threshold from `~/.claude/CLAUDE.md`.

### Build order (within this PR)

1. **Schema** (`chat.db.ts`) — column + index + check constraint
2. **Zod** (`chat.zod.ts`) — response and input schemas
3. **Service** (`chat.service.ts`) — three-way branch in `getMessages` and `create`
4. **Router** (`chat.router.ts`) — input zod extension
5. **Geo helper** (`lib/geo/country-of.ts`, new) — extracted point-in-polygon
6. **Choropleth refactor** (`country-choropleth.tsx`) — use the helper for `countryCounts`, then add click handler + selected style + new props
7. **nuqs parser** (`lib/nuqs-parsers.ts`) — `parseAsCountryIso3`
8. **Hook refactor** (`use-chat.ts`) — discriminated union scope + `selectChatScope` helper
9. **Hook callsite update** (`event-detail-panel.tsx`) — `useChat({ kind: "event", eventId: event.id })`
10. **Pre-seed component** (`country-events-header.tsx`, new)
11. **Sidebar update** (`map-sidebar.tsx`) — accept scope, dynamic header, render pre-seed
12. **World-map wiring** (`world-map.tsx`) — `?country=` state, scope priority, prop wiring

After all 12 steps land in the diff, **stop**. Per `~/.claude/CLAUDE.md`: don't run db:generate, tests, typecheck, or lint. Wait for review. Migration runs only when explicitly asked.

---

## 1. Goals & non-goals

### Goals

- Per-country chat using the same `chat_message` table and the same `chat.getMessages` / `chat.send` procedures.
- Country selection is map-native (click the choropleth) and URL-shareable (`?country=USA`).
- Cold-start solved by pre-seeding country chat with that country's recent events as inline cards above the message list.
- Reuse the existing point-in-polygon logic from the choropleth — no new geo dependency, no new GeoJSON file.
- Single source of truth for "what chat room am I in" via `ChatScope` discriminated union.

### Non-goals

- **No claim mechanics** — separate brainstorm, not in this PR.
- **No new chat tables** — countries reuse the room concept.
- **No new typeid** — ISO-A3 is an external standard.
- **No real-time push** — keep the existing 3s React Query polling per `feedback_no_socketio.md`.
- **No mobile country browser** — selection is map-driven only.
- **No backfill** — global stays global, untouched.
- **No new categories.**
- **No cross-room sync** — strict scopes, mutually exclusive.

---

## 2. Schema spec

`groundtruth/src/server/db/schema/chat/chat.db.ts`

Add column `countryIso3` and a new index, a new check constraint:

```ts
import { check, index, pgTable, text, varchar } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
// ...

export const chatMessage = pgTable(
  "chat_message",
  {
    id: typeId("chatMessage", "id")
      .primaryKey()
      .$defaultFn(() => typeIdGenerator("chatMessage"))
      .$type<ChatMessageId>(),
    eventId: typeId("worldEvent", "event_id")
      .references(() => worldEvent.id)
      .$type<WorldEventId>(),
    countryIso3: varchar("country_iso3", { length: 3 }),
    userId: typeId("user", "user_id")
      .references(() => user.id)
      .$type<UserId>()
      .notNull(),
    authorName: text("author_name").notNull(),
    content: text("content").notNull(),
    agentAddress: text("agent_address"),
    agentEnsName: text("agent_ens_name"),
    ...baseEntityFields,
  },
  (table) => [
    index("chat_message_event_created_idx").on(table.eventId, table.createdAt),
    index("chat_message_country_created_idx").on(table.countryIso3, table.createdAt),
    index("chat_message_userId_idx").on(table.userId),
    check(
      "chat_message_scope_exclusive",
      sql`${table.eventId} IS NULL OR ${table.countryIso3} IS NULL`
    ),
  ]
)
```

`baseEntityFields` and `typeId` import from `../../utils` (the codebase's existing convention from `event.db.ts:14`). The `check` import is new for this codebase.

Migration: created via `bun run db:generate` **only when the user explicitly asks**. The check constraint is the first one in the codebase; if drizzle-kit's introspection has any quirks, that's a v1.5 problem to address when the migration is generated.

---

## 3. Zod spec

`groundtruth/src/server/db/schema/chat/chat.zod.ts`

```ts
const countryIso3Schema = z.string().length(3).regex(/^[A-Z]{3}$/)

export const chatMessageResponseSchema = z.object({
  id: ChatMessageId,
  eventId: WorldEventId.nullable(),
  countryIso3: countryIso3Schema.nullable(),
  authorName: z.string(),
  content: z.string(),
  userId: UserId,
  createdAt: z.string(),
  worldIdVerified: z.boolean(),
  agentAddress: z.string().nullable(),
  agentEnsName: z.string().nullable(),
})

export const createChatMessageInputSchema = z
  .object({
    eventId: WorldEventId.nullable().optional(),
    countryIso3: countryIso3Schema.nullable().optional(),
    content: z.string().min(1).max(2000),
  })
  .refine(
    (d) => !(d.eventId && d.countryIso3),
    { message: "eventId and countryIso3 are mutually exclusive" }
  )

export type ChatMessageResponse = z.infer<typeof chatMessageResponseSchema>
```

---

## 4. Router spec

`groundtruth/src/server/api/routers/chat.router.ts`

`getMessages` input gets the same `countryIso3` field with the same mutual-exclusion refine. `send` already uses `createChatMessageInputSchema` so no change needed there.

```ts
getMessages: publicProcedure
  .input(
    z
      .object({
        eventId: WorldEventId.nullable().optional(),
        countryIso3: z.string().length(3).regex(/^[A-Z]{3}$/).nullable().optional(),
        limit: z.number().int().min(1).max(100).optional(),
        cursor: ChatMessageId.optional(),
      })
      .refine(
        (d) => !(d.eventId && d.countryIso3),
        { message: "eventId and countryIso3 are mutually exclusive" }
      )
  )
  .handler(async ({ input, context }) => {
    context.log.set({
      procedure: "chat.getMessages",
      eventId: input.eventId,
      countryIso3: input.countryIso3,
    })
    return context.chatService.getMessages(input)
  }),
```

---

## 5. Service spec

`groundtruth/src/server/services/chat.service.ts`

`getMessages` becomes a three-way branch:

```ts
async function getMessages(params: {
  eventId?: WorldEventId | null
  countryIso3?: string | null
  limit?: number
  cursor?: ChatMessageId
}) {
  const conditions: SQL[] = []

  if (params.eventId) {
    conditions.push(eq(chatMessage.eventId, params.eventId))
  } else if (params.countryIso3) {
    conditions.push(eq(chatMessage.countryIso3, params.countryIso3))
  } else {
    conditions.push(isNull(chatMessage.eventId))
    conditions.push(isNull(chatMessage.countryIso3))
  }

  if (params.cursor) { /* unchanged */ }
  // unchanged: rows query, joins, ordering
}
```

`create()` accepts `countryIso3` and inserts it. `toResponse()` surfaces it. The `worldIdVerified` join is unchanged.

---

## 6. Frontend spec

### 6.1 nuqs parser — `lib/nuqs-parsers.ts`

```ts
export const parseAsCountryIso3 = createParser<string>({
  parse: (value) => (/^[A-Z]{3}$/.test(value) ? value : null),
  serialize: (value) => value,
})
```

### 6.2 Hook refactor — `hooks/use-chat.ts`

```ts
export type ChatScope =
  | { kind: "global" }
  | { kind: "event"; eventId: WorldEventId }
  | { kind: "country"; countryIso3: string }

export function selectChatScope(params: {
  selectedEventId: WorldEventId | null
  selectedCountryIso3: string | null
}): ChatScope {
  if (params.selectedEventId) return { kind: "event", eventId: params.selectedEventId }
  if (params.selectedCountryIso3) return { kind: "country", countryIso3: params.selectedCountryIso3 }
  return { kind: "global" }
}

function scopeKey(scope: ChatScope): string {
  if (scope.kind === "event") return scope.eventId
  if (scope.kind === "country") return scope.countryIso3
  return "global"
}

function scopeToInput(scope: ChatScope) {
  if (scope.kind === "event") return { eventId: scope.eventId, countryIso3: null }
  if (scope.kind === "country") return { eventId: null, countryIso3: scope.countryIso3 }
  return { eventId: null, countryIso3: null }
}

export function useChat(
  scope: ChatScope,
  options?: { enabled?: boolean }
) {
  const queryClient = useQueryClient()
  const queryKey = ["chat", "messages", scope.kind, scopeKey(scope)]
  const enabled = options?.enabled ?? true

  const messages = useQuery({
    queryKey,
    queryFn: () =>
      client.chat.getMessages({ ...scopeToInput(scope), limit: 50 }),
    refetchInterval: enabled ? 3000 : false,
    enabled,
  })

  const send = useMutation({
    mutationFn: (params: { content: string }) =>
      client.chat.send({ ...scopeToInput(scope), content: params.content }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: (error) => {
      toast.error("Failed to send message", { description: error.message })
    },
  })

  return { messages, send }
}
```

### 6.3 Hook callsites

- `event-detail-panel.tsx:50` → `useChat({ kind: "event", eventId: event.id })`
- `map-sidebar.tsx:196` → `useChat(chatScope, { enabled: activeTab === "chat" })` where `chatScope` is a new prop from `world-map.tsx`

### 6.4 Geo helper — `lib/geo/country-of.ts` (new)

```ts
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

let cachedGeo: FeatureCollection | null = null

export async function loadCountryGeoJSON(): Promise<FeatureCollection> {
  if (cachedGeo) return cachedGeo
  const res = await fetch("/geo/ne_110m_admin_0_countries.geojson")
  const data: FeatureCollection = await res.json()
  cachedGeo = data
  return data
}
```

The choropleth at `country-choropleth.tsx:11` already has its own `cachedGeoJSON` module-level cache. Both files can coexist with their own caches in v1; consolidating to a single cache is a v1.5 polish.

### 6.5 Choropleth — `country-choropleth.tsx`

Add props:
```ts
{ events, selectedCountryIso3, reportMode, onSelectCountry }
```

Click handler in `onEachFeature`:
```ts
layer.on({
  click: (e: LeafletMouseEvent) => {
    if (reportMode) return
    if (count === 0) return
    L.DomEvent.stopPropagation(e)
    onSelectCountry(iso, name)
  },
  // ...existing mouseover/mouseout
})
```

Selected style override in `getCountryStyle`:
```ts
function getCountryStyle(count: number, isDark: boolean, isSelected: boolean): PathOptions {
  const base = /* unchanged */
  if (isSelected) {
    return {
      ...base,
      weight: 2.5,
      color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)",
      fillOpacity: Math.min((base.fillOpacity ?? 0) + 0.15, 0.7),
    }
  }
  return base
}
```

The `style` callback and `geoKey` memo include `selectedCountryIso3` so the GeoJSON layer re-renders on selection change.

### 6.6 Pre-seed component — `country-events-header.tsx` (new)

```tsx
"use client"

import { useMemo } from "react"
import { useEvents } from "@/hooks/use-events"
import { pointToCountryIso3 } from "@/lib/geo/country-of"
import { useCountryGeoJSON } from "@/hooks/use-country-geojson"
// ...

export function CountryEventsHeader({
  iso3,
  countryName,
  onSelectEvent,
}: {
  iso3: string
  countryName: string
  onSelectEvent: (id: WorldEventId) => void
}) {
  const { data: events = [] } = useEvents()
  const geo = useCountryGeoJSON()

  const inCountry = useMemo(() => {
    if (!geo) return []
    return events
      .filter((e) => pointToCountryIso3(e.coordinates[0], e.coordinates[1], geo) === iso3)
      .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))
      .slice(0, 5)
  }, [events, geo, iso3])

  if (inCountry.length === 0) return null

  return (
    <div className="border-b bg-muted/30 px-3 py-2">
      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
        Recent in {countryName}
      </p>
      <div className="space-y-1">
        {inCountry.map((e) => (
          <button
            key={e.id}
            onClick={() => onSelectEvent(e.id)}
            className="w-full text-left text-[11px] text-foreground/80 hover:text-foreground"
          >
            {/* compact event card — matches EventListItem styling */}
          </button>
        ))}
      </div>
    </div>
  )
}
```

A small helper hook `useCountryGeoJSON` wraps `loadCountryGeoJSON` from the geo helper into a `useState`+`useEffect` (or React Query). v1: simple effect.

### 6.7 Sidebar — `map-sidebar.tsx`

New props on `MapSidebar`:
```ts
chatScope: ChatScope
selectedCountryName: string | null
onClearCountry: () => void
onSelectEvent: ... (already exists)
```

Replace `const { messages, send } = useChat(null, ...)` with:
```ts
const { messages, send } = useChat(chatScope, { enabled: activeTab === "chat" })
```

Replace the hardcoded "Global Chat" header at line 387 with a dynamic switch:
```tsx
{chatScope.kind === "global" && <span className="text-xs font-medium">Global Chat</span>}
{chatScope.kind === "country" && (
  <>
    <span className="text-xs font-medium">{selectedCountryName ?? chatScope.countryIso3}</span>
    <Button variant="ghost" size="icon-xs" className="ml-auto size-5" onClick={onClearCountry}>
      <XIcon size={10} />
    </Button>
  </>
)}
{chatScope.kind === "event" && (
  /* unreachable in sidebar — event chat lives in event-detail-panel */
  <span className="text-xs font-medium">Event Chat</span>
)}
```

Above the `ScrollArea` containing messages, when `chatScope.kind === "country"`, render `<CountryEventsHeader iso3={chatScope.countryIso3} countryName={selectedCountryName ?? chatScope.countryIso3} onSelectEvent={onSelectEvent} />`.

Note on scope priority and the sidebar: when an event is selected, the event detail panel covers the right side and *its* chat is active. The sidebar's own chat reflects the country (or global if no country). The `event` branch in the sidebar header should never render in practice because `world-map.tsx` resolves scope priority before passing it down — the sidebar receives a scope of `country` or `global`, not `event`. The unreachable branch is defensive only.

### 6.8 World-map — `world-map.tsx`

Add nuqs state:
```ts
const [selectedCountryIso3, setSelectedCountryIso3] = useQueryState("country", parseAsCountryIso3)
```

Resolve scopes (sidebar gets country|global; event-detail handles event itself):
```ts
const sidebarChatScope: ChatScope =
  selectedCountryIso3
    ? { kind: "country", countryIso3: selectedCountryIso3 }
    : { kind: "global" }
```

(We don't use `selectChatScope` here because the sidebar's chat is the *non-event* fallback — events are handled by `EventDetailPanel`. `selectChatScope` is exported for the rare consumer that wants the full priority resolution.)

Country name lookup for the sidebar header — call `countryNameFromIso3(selectedCountryIso3, cachedGeo)` or pass an additional small `useCountryName(iso3)` hook. v1: a small hook that loads the same cached GeoJSON.

Pass new props to `<CountryChoropleth>`:
```tsx
<CountryChoropleth
  events={filteredEvents}
  selectedCountryIso3={selectedCountryIso3}
  reportMode={reportMode}
  onSelectCountry={(iso) => {
    setSelectedCountryIso3(iso)
    setSidebarTab("chat")
    setSidebarCollapsed(false)
  }}
/>
```

Pass new props to `<MapSidebar>`:
```tsx
<MapSidebar
  // ...existing props
  chatScope={sidebarChatScope}
  selectedCountryName={countryName}
  onClearCountry={() => setSelectedCountryIso3(null)}
/>
```

---

## 7. Manual validation checklist

After the user runs `bun run db:generate` and applies the migration:

- [ ] Open the app, see global chat as today (no regression)
- [ ] Click a country with events on the choropleth → sidebar opens to Chat tab → header shows country name → pre-seed shows recent events → message list is empty (or shows country-scoped messages)
- [ ] Send a message in country chat → it appears
- [ ] Click another country → switches scope, messages re-fetch
- [ ] Click × on country header → returns to global
- [ ] Open URL `?country=USA` in a fresh tab → loads directly into US chat
- [ ] Open URL `?event=wev_...&country=USA` → event wins, event detail panel shows event chat
- [ ] Click a country with 0 events → nothing happens (gated)
- [ ] Toggle report mode → click country → places a pin (country click suppressed)
- [ ] Click an event card in the country pre-seed → opens event detail panel
- [ ] Verify CHECK constraint blocks malformed inserts (manual SQL test or unit test, optional)

Per `~/.claude/CLAUDE.md`: **none of this is run by Claude**. The user runs it after reviewing the diff.

---

## 8. File diff summary

| # | File | Status | Lines (approx) |
|---|---|---|---|
| 1 | `groundtruth/spec/country-chat-implementation-plan.md` | NEW | this file |
| 2 | `groundtruth/src/server/db/schema/chat/chat.db.ts` | MOD | +6 |
| 3 | `groundtruth/src/server/db/schema/chat/chat.zod.ts` | MOD | +8 |
| 4 | `groundtruth/src/server/services/chat.service.ts` | MOD | +12 |
| 5 | `groundtruth/src/server/api/routers/chat.router.ts` | MOD | +6 |
| 6 | `groundtruth/src/lib/nuqs-parsers.ts` | MOD | +6 |
| 7 | `groundtruth/src/lib/geo/country-of.ts` | NEW | ~60 |
| 8 | `groundtruth/src/hooks/use-chat.ts` | MOD | ~+40 (refactor) |
| 9 | `groundtruth/src/components/map/country-choropleth.tsx` | MOD | +30 |
| 10 | `groundtruth/src/components/map/country-events-header.tsx` | NEW | ~70 |
| 11 | `groundtruth/src/components/map/map-sidebar.tsx` | MOD | +20 |
| 12 | `groundtruth/src/components/map/world-map.tsx` | MOD | +20 |
| 13 | `groundtruth/src/components/map/event-detail-panel.tsx` | MOD | +1 (hook callsite) |

**Total: 11 modified + 2 new = 13 file touches.** Under the 15-file ask-first threshold. Single PR.

---

## 9. Conflict check vs in-flight overlay-feeds PR

| File | overlay-feeds PR touches? | country chat touches? | Conflict? |
|---|---|---|---|
| `world-map.tsx` | yes (already in HEAD: `<OverlayLayers>`, `<NasaGibsTileLayer>`, `<LayersPopover>`) | yes (nuqs `?country=`, prop wiring) | **No** — different lines, different concerns |
| `country-choropleth.tsx` | no | yes | **No** |
| `chat.*` files | no | yes | **No** |
| `use-chat.ts` | no | yes | **No** |
| `lib/feeds/*`, `hooks/feeds/*`, `components/map/overlays/*` | yes | no | **No** — country chat doesn't touch feeds |
| `map-sidebar.tsx` | not in current diff | yes | **No** |

Country chat can land independently on top of the overlay-feeds PR.
