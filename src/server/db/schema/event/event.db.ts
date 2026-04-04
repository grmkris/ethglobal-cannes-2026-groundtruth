import {
  doublePrecision,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core"
import { type WorldEventId, typeIdGenerator } from "@/lib/typeid"
import { baseEntityFields, typeId } from "../../utils"

export const eventCategoryEnum = pgEnum("event_category", [
  "conflict",
  "natural-disaster",
  "politics",
  "economics",
  "health",
  "technology",
  "environment",
  "social",
])

export const severityLevelEnum = pgEnum("severity_level", [
  "low",
  "medium",
  "high",
  "critical",
])

export const worldEvent = pgTable("world_event", {
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
  ...baseEntityFields,
})
