import { index, pgTable, text } from "drizzle-orm/pg-core"
import { type ChatMessageId, typeIdGenerator } from "@/lib/typeid"
import { baseEntityFields, typeId } from "../../utils"
import { worldEvent } from "../event/event.db"

export const chatMessage = pgTable(
  "chat_message",
  {
    id: typeId("chatMessage", "id")
      .primaryKey()
      .$defaultFn(() => typeIdGenerator("chatMessage"))
      .$type<ChatMessageId>(),
    eventId: typeId("worldEvent", "event_id").references(() => worldEvent.id),
    authorName: text("author_name").notNull(),
    content: text("content").notNull(),
    ...baseEntityFields,
  },
  (table) => [index("chat_message_event_created_idx").on(table.eventId, table.createdAt)]
)
