import { relations } from "drizzle-orm"
import { chatMessage } from "./chat.db"
import { worldEvent } from "../event/event.db"
import { user } from "../auth/auth.db"

export const chatMessageRelations = relations(chatMessage, ({ one }) => ({
  event: one(worldEvent, {
    fields: [chatMessage.eventId],
    references: [worldEvent.id],
  }),
  user: one(user, {
    fields: [chatMessage.userId],
    references: [user.id],
    relationName: "userMessages",
  }),
}))
