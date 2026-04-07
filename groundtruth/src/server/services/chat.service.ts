import { and, desc, eq, getTableColumns, isNull, lt, type SQL } from "drizzle-orm"
import { getAddress } from "viem"
import type { ChatMessageId, UserId, WorldEventId } from "@/lib/typeid"
import type { ChatMessageResponse } from "@/server/db/schema/chat/chat.zod"
import { chatMessage } from "../db/schema/chat/chat.db"
import { user } from "../db/schema/auth/auth.db"
import type { Database } from "../db/db"

function toResponse(
  row: typeof chatMessage.$inferSelect & { worldIdVerified: boolean }
): ChatMessageResponse {
  return {
    id: row.id,
    eventId: row.eventId,
    countryIso3: row.countryIso3 ?? null,
    authorName: row.authorName,
    content: row.content,
    userId: row.userId,
    createdAt: row.createdAt.toISOString(),
    worldIdVerified: row.worldIdVerified,
    agentAddress: row.agentAddress ?? null,
    agentEnsName: row.agentEnsName ?? null,
  }
}

export function createChatService(props: { db: Database }) {
  const { db } = props

  async function getMessages(params: {
    eventId?: WorldEventId | null
    countryIso3?: string | null
    limit?: number
    cursor?: ChatMessageId
  }) {
    const conditions: SQL[] = []

    if (params.eventId) {
      conditions.push(eq(chatMessage.eventId, params.eventId))
    } else if (params.countryIso3) {
      conditions.push(eq(chatMessage.countryIso3, params.countryIso3))
    } else {
      conditions.push(isNull(chatMessage.eventId))
      conditions.push(isNull(chatMessage.countryIso3))
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
      .select({
        ...getTableColumns(chatMessage),
        worldIdVerified: user.worldIdVerified,
      })
      .from(chatMessage)
      .innerJoin(user, eq(chatMessage.userId, user.id))
      .where(and(...conditions))
      .orderBy(desc(chatMessage.createdAt))
      .limit(limit)

    return rows.map(toResponse).reverse()
  }

  async function create(params: {
    eventId?: WorldEventId | null
    countryIso3?: string | null
    authorName: string
    content: string
    userId: UserId
    agentAddress?: string | null
    agentEnsName?: string | null
  }) {
    if (params.eventId && params.countryIso3) {
      throw new Error("eventId and countryIso3 are mutually exclusive")
    }
    const [row] = await db
      .insert(chatMessage)
      .values({
        eventId: params.eventId ?? null,
        countryIso3: params.countryIso3 ?? null,
        authorName: params.authorName,
        content: params.content,
        userId: params.userId,
        agentAddress: params.agentAddress ? getAddress(params.agentAddress) : null,
        agentEnsName: params.agentEnsName ?? null,
      })
      .returning()

    const userRow = await db.query.user.findFirst({
      where: (u, { eq }) => eq(u.id, params.userId),
      columns: { worldIdVerified: true },
    })

    return toResponse({
      ...row,
      worldIdVerified: userRow?.worldIdVerified ?? false,
    })
  }

  return { getMessages, create }
}

export type ChatService = ReturnType<typeof createChatService>
