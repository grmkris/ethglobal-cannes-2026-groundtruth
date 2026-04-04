import { z } from "zod"
import { ChatMessageId, UserId, WorldEventId } from "@/lib/typeid"
import { createChatMessageInputSchema } from "@/server/db/schema/chat/chat.zod"
import { authedProcedure, publicProcedure } from "../api"

export const chatRouter = {
  getMessages: publicProcedure
    .input(
      z.object({
        eventId: WorldEventId.nullable().optional(),
        limit: z.number().int().min(1).max(100).optional(),
        cursor: ChatMessageId.optional(),
      })
    )
    .handler(async ({ input, context }) => {
      context.log.set({ procedure: "chat.getMessages", eventId: input.eventId })
      return context.chatService.getMessages(input)
    }),

  send: authedProcedure
    .input(createChatMessageInputSchema)
    .handler(async ({ input, context }) => {
      const authorName = context.session.user.name
      const userId = UserId.parse(context.session.user.id)
      context.log.set({ procedure: "chat.send", eventId: input.eventId, userId })
      return context.chatService.create({
        eventId: input.eventId,
        content: input.content,
        authorName,
        userId,
      })
    }),
}
