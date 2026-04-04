import { z } from "zod"
import { ChatMessageId, UserId, WorldEventId } from "@/lib/typeid"

export const chatMessageResponseSchema = z.object({
  id: ChatMessageId,
  eventId: WorldEventId.nullable(),
  authorName: z.string(),
  content: z.string(),
  userId: UserId,
  createdAt: z.string(),
})

export const createChatMessageInputSchema = z.object({
  eventId: WorldEventId.nullable().optional(),
  content: z.string().min(1).max(2000),
})

export type ChatMessageResponse = z.infer<typeof chatMessageResponseSchema>
