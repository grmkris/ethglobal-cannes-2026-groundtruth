import { index, pgTable, text } from "drizzle-orm/pg-core"
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
    userId: typeId("user", "user_id")
      .references(() => user.id)
      .$type<UserId>()
      .notNull(),
    authorName: text("author_name").notNull(),
    content: text("content").notNull(),
    agentAddress: text("agent_address"),
    ...baseEntityFields,
  },
  (table) => [
    index("chat_message_event_created_idx").on(table.eventId, table.createdAt),
    index("chat_message_userId_idx").on(table.userId),
  ]
)
