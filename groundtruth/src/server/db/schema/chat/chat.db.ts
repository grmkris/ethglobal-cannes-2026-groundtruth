import { check, index, pgTable, text, varchar } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { type ChatMessageId, type UserId, type WorldEventId, typeIdGenerator } from "@/lib/typeid"
import { baseEntityFields, typeId } from "../../utils"
import { worldEvent } from "../event/event.db"
import { user } from "../auth/auth.db"

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
