import { z } from "zod"
import { ChatMessageId, UserId, WorldEventId } from "@/lib/typeid"
import { countryIso3Schema, createChatMessageInputSchema } from "@/server/db/schema/chat/chat.zod"
import { authedProcedure, publicProcedure } from "../api"

export const chatRouter = {
  getMessages: publicProcedure
    .input(
      z
        .object({
          eventId: WorldEventId.nullable().optional(),
          countryIso3: countryIso3Schema.nullable().optional(),
          limit: z.number().int().min(1).max(100).optional(),
          cursor: ChatMessageId.optional(),
        })
        .refine((d) => !(d.eventId && d.countryIso3), {
          message: "eventId and countryIso3 are mutually exclusive",
        })
    )
    .handler(async ({ input, context }) => {
      context.log.set({
        procedure: "chat.getMessages",
        eventId: input.eventId,
        countryIso3: input.countryIso3,
      })
      return context.chatService.getMessages(input)
    }),

  send: authedProcedure
    .input(createChatMessageInputSchema)
    .handler(async ({ input, context }) => {
      const authorName = context.session.user.name
      const userId = UserId.parse(context.session.user.id)
      context.log.set({
        procedure: "chat.send",
        eventId: input.eventId,
        countryIso3: input.countryIso3,
        userId,
      })
      return context.chatService.create({
        eventId: input.eventId,
        countryIso3: input.countryIso3,
        content: input.content,
        authorName,
        userId,
      })
    }),
}
