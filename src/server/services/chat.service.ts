import { and, asc, desc, eq, isNull, lt, type SQL } from "drizzle-orm"
import type { ChatMessageId, UserId, WorldEventId } from "@/lib/typeid"
import type { ChatMessageResponse } from "@/server/db/schema/chat/chat.zod"
import { chatMessage } from "../db/schema/chat/chat.db"
import type { Database } from "../db/db"

function toResponse(row: typeof chatMessage.$inferSelect): ChatMessageResponse {
  return {
    id: row.id,
    eventId: row.eventId,
    authorName: row.authorName,
    content: row.content,
    userId: row.userId,
    createdAt: row.createdAt.toISOString(),
  }
}

export function createChatService(props: { db: Database }) {
  const { db } = props

  async function getMessages(params: {
    eventId?: WorldEventId | null
    limit?: number
    cursor?: ChatMessageId
  }) {
    const conditions: SQL[] = []

    if (params.eventId) {
      conditions.push(eq(chatMessage.eventId, params.eventId))
    } else {
      conditions.push(isNull(chatMessage.eventId))
    }

    if (params.cursor) {
      const cursorRow = await db.query.chatMessage.findFirst({
        where: eq(chatMessage.id, params.cursor),
        columns: { createdAt: true },
      })
      if (cursorRow) {
        conditions.push(lt(chatMessage.createdAt, cursorRow.createdAt))
      }
    }

    const limit = params.limit ?? 50

    const rows = await db
      .select()
      .from(chatMessage)
      .where(and(...conditions))
      .orderBy(desc(chatMessage.createdAt))
      .limit(limit)

    return rows.map(toResponse).reverse()
  }

  async function create(params: {
    eventId?: WorldEventId | null
    authorName: string
    content: string
    userId: UserId
  }) {
    const [row] = await db
      .insert(chatMessage)
      .values({
        eventId: params.eventId ?? null,
        authorName: params.authorName,
        content: params.content,
        userId: params.userId,
      })
      .returning()
    return toResponse(row)
  }

  return { getMessages, create }
}

export type ChatService = ReturnType<typeof createChatService>
