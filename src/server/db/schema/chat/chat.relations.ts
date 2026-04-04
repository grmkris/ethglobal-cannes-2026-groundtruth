import { relations } from "drizzle-orm"
import { chatMessage } from "./chat.db"
import { worldEvent } from "../event/event.db"

export const chatMessageRelations = relations(chatMessage, ({ one }) => ({
  event: one(worldEvent, {
    fields: [chatMessage.eventId],
    references: [worldEvent.id],
  }),
}))
