import { relations } from "drizzle-orm"
import { worldEvent } from "./event.db"
import { chatMessage } from "../chat/chat.db"

export const worldEventRelations = relations(worldEvent, ({ many }) => ({
  chatMessages: many(chatMessage),
}))
