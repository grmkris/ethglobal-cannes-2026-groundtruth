import { z } from "zod"
import { ChatMessageId, UserId, WorldEventId } from "@/lib/typeid"

export const countryIso3Schema = z.string().length(3).regex(/^[A-Z]{3}$/)

export const chatMessageResponseSchema = z.object({
  id: ChatMessageId,
  eventId: WorldEventId.nullable(),
  countryIso3: countryIso3Schema.nullable(),
  authorName: z.string(),
  content: z.string(),
  userId: UserId,
  createdAt: z.string(),
  worldIdVerified: z.boolean(),
  agentAddress: z.string().nullable(),
  agentEnsName: z.string().nullable(),
})

export const createChatMessageInputSchema = z
  .object({
    eventId: WorldEventId.nullable().optional(),
    countryIso3: countryIso3Schema.nullable().optional(),
    content: z.string().min(1).max(2000),
  })
  .refine((d) => !(d.eventId && d.countryIso3), {
    message: "eventId and countryIso3 are mutually exclusive",
  })

export type ChatMessageResponse = z.infer<typeof chatMessageResponseSchema>
