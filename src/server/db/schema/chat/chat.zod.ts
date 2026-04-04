import { z } from "zod"
import { ChatMessageId, WorldEventId } from "@/lib/typeid"

export const chatMessageResponseSchema = z.object({
  id: ChatMessageId,
  eventId: WorldEventId.nullable(),
  authorName: z.string(),
  content: z.string(),
  createdAt: z.string(),
})

export const createChatMessageInputSchema = z.object({
  eventId: WorldEventId.nullable().optional(),
  authorName: z.string().min(1).max(50),
  content: z.string().min(1).max(2000),
})

export type ChatMessageResponse = z.infer<typeof chatMessageResponseSchema>
