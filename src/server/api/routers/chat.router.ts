import { z } from "zod"
import { ChatMessageId, WorldEventId } from "@/lib/typeid"
import { createChatMessageInputSchema } from "@/server/db/schema/chat/chat.zod"
import { publicProcedure } from "../api"

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

  send: publicProcedure
    .input(createChatMessageInputSchema)
    .handler(async ({ input, context }) => {
      context.log.set({ procedure: "chat.send", eventId: input.eventId })
      return context.chatService.create(input)
    }),
}
