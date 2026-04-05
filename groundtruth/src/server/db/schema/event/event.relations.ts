import { relations } from "drizzle-orm"
import { worldEvent, eventDispute } from "./event.db"
import { chatMessage } from "../chat/chat.db"
import { user } from "../auth/auth.db"

export const worldEventRelations = relations(worldEvent, ({ one, many }) => ({
  chatMessages: many(chatMessage),
  disputes: many(eventDispute),
  user: one(user, {
    fields: [worldEvent.userId],
    references: [user.id],
    relationName: "userEvents",
  }),
  canonicalEvent: one(worldEvent, {
    fields: [worldEvent.canonicalEventId],
    references: [worldEvent.id],
    relationName: "corroborations",
  }),
  corroborations: many(worldEvent, { relationName: "corroborations" }),
}))

export const eventDisputeRelations = relations(eventDispute, ({ one }) => ({
  event: one(worldEvent, {
    fields: [eventDispute.eventId],
    references: [worldEvent.id],
  }),
  user: one(user, {
    fields: [eventDispute.userId],
    references: [user.id],
  }),
}))
