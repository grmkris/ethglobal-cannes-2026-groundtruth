import {
  doublePrecision,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core"
import { type UserId, type WorldEventId, typeIdGenerator } from "@/lib/typeid"
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
    ...baseEntityFields,
  },
  (table) => [
    index("worldEvent_userId_idx").on(table.userId),
    index("worldEvent_category_idx").on(table.category),
    index("worldEvent_timestamp_idx").on(table.timestamp),
  ]
)
