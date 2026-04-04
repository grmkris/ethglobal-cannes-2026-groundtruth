import { relations } from "drizzle-orm"
import { worldEvent } from "./event.db"
import { chatMessage } from "../chat/chat.db"
import { user } from "../auth/auth.db"

export const worldEventRelations = relations(worldEvent, ({ one, many }) => ({
  chatMessages: many(chatMessage),
  user: one(user, {
    fields: [worldEvent.userId],
    references: [user.id],
    relationName: "userEvents",
  }),
}))
