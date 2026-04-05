import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core"
import { type UserId, type WorldEventId, type EventDisputeId, typeIdGenerator } from "@/lib/typeid"
import { EVENT_CATEGORY_VALUES, SEVERITY_LEVEL_VALUES } from "@/lib/event-constants"
import { baseEntityFields, typeId } from "../../utils"
import { user } from "../auth/auth.db"

export const eventCategoryEnum = pgEnum("event_category", [...EVENT_CATEGORY_VALUES])

export const severityLevelEnum = pgEnum("severity_level", [...SEVERITY_LEVEL_VALUES])

export const worldEvent = pgTable(
  "world_event",
  {
    id: typeId("worldEvent", "id")
      .primaryKey()
      .$defaultFn(() => typeIdGenerator("worldEvent"))
      .$type<WorldEventId>(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    category: eventCategoryEnum("category").notNull(),
    severity: severityLevelEnum("severity").notNull(),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    location: text("location").notNull(),
    timestamp: timestamp("timestamp", { withTimezone: true, mode: "date" }).notNull(),
    source: text("source"),
    imageUrls: jsonb("image_urls").$type<string[]>().default([]).notNull(),
    userId: typeId("user", "user_id")
      .references(() => user.id)
      .$type<UserId>()
      .notNull(),
    agentAddress: text("agent_address"),
    agentEnsName: text("agent_ens_name"),
    erc8004AgentId: text("erc8004_agent_id"),
    onChainVerified: boolean("on_chain_verified").default(false).notNull(),
    // Corroboration
    canonicalEventId: typeId("worldEvent", "canonical_event_id")
      .$type<WorldEventId>(),
    corroborationCount: integer("corroboration_count").default(0).notNull(),
    // Disputes
    disputeCount: integer("dispute_count").default(0).notNull(),
    ...baseEntityFields,
  },
  (table) => [
    index("worldEvent_userId_idx").on(table.userId),
    index("worldEvent_category_idx").on(table.category),
    index("worldEvent_timestamp_idx").on(table.timestamp),
  ]
)

// --- Dispute reasons ---
export const DISPUTE_REASONS = ["inaccurate", "misleading", "fabricated"] as const
export type DisputeReason = (typeof DISPUTE_REASONS)[number]

export const DISPUTE_VALUES: Record<DisputeReason, number> = {
  inaccurate: -1,
  misleading: -2,
  fabricated: -3,
} as const

// --- Event disputes ---
export const eventDispute = pgTable(
  "event_dispute",
  {
    id: typeId("eventDispute", "id")
      .primaryKey()
      .$defaultFn(() => typeIdGenerator("eventDispute"))
      .$type<EventDisputeId>(),
    eventId: typeId("worldEvent", "event_id")
      .notNull()
      .references(() => worldEvent.id, { onDelete: "cascade" })
      .$type<WorldEventId>(),
    userId: typeId("user", "user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" })
      .$type<UserId>(),
    reason: text("reason").notNull().$type<DisputeReason>(),
    justification: text("justification"),
    txHash: text("tx_hash"),
    ...baseEntityFields,
  },
  (table) => [
    index("eventDispute_eventId_idx").on(table.eventId),
    index("eventDispute_userId_idx").on(table.userId),
  ]
)
