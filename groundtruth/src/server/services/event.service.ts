import { and, desc, eq, getTableColumns, ilike, isNotNull, or, sql, type SQL } from "drizzle-orm"
import { getAddress } from "viem"
import type { UserId, WorldEventId } from "@/lib/typeid"
import type { Database } from "../db/db"
import type {
  EventCategory,
  SeverityLevel,
  WorldEventResponse,
} from "@/server/db/schema/event/event.zod"
import { worldEvent, eventDispute, type DisputeReason } from "../db/schema/event/event.db"
import { chatMessage } from "../db/schema/chat/chat.db"
import { user } from "../db/schema/auth/auth.db"
import { computeConfidence } from "@/lib/confidence"

function toWorldEvent(
  row: typeof worldEvent.$inferSelect & { worldIdVerified: boolean; creatorName: string }
): WorldEventResponse & { confidenceScore: number; confidenceLevel: string } {
  const confidence = computeConfidence({
    corroborationCount: row.corroborationCount,
    disputeCount: row.disputeCount,
    worldIdVerified: row.worldIdVerified,
    onChainVerified: row.onChainVerified,
    source: row.source,
  })
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    severity: row.severity,
    coordinates: [row.latitude, row.longitude],
    location: row.location,
    timestamp: row.timestamp.toISOString(),
    source: row.source,
    imageUrls: row.imageUrls,
    userId: row.userId,
    worldIdVerified: row.worldIdVerified,
    creatorName: row.creatorName,
    agentAddress: row.agentAddress ?? null,
    agentEnsName: row.agentEnsName ?? null,
    erc8004AgentId: row.erc8004AgentId ?? null,
    onChainVerified: row.onChainVerified,
    canonicalEventId: row.canonicalEventId ?? null,
    corroborationCount: row.corroborationCount,
    disputeCount: row.disputeCount,
    confidenceScore: confidence.score,
    confidenceLevel: confidence.level,
  }
}

export function createEventService(props: { db: Database }) {
  const { db } = props

  async function getAll(params?: {
    category?: EventCategory
    severity?: SeverityLevel
    search?: string
  }) {
    const conditions: SQL[] = []

    if (params?.category) {
      conditions.push(eq(worldEvent.category, params.category))
    }
    if (params?.severity) {
      conditions.push(eq(worldEvent.severity, params.severity))
    }
    if (params?.search) {
      const pattern = `%${params.search}%`
      const searchCondition = or(
        ilike(worldEvent.title, pattern),
        ilike(worldEvent.location, pattern)
      )
      if (searchCondition) conditions.push(searchCondition)
    }

    const rows = await db
      .select({
        ...getTableColumns(worldEvent),
        worldIdVerified: user.worldIdVerified,
        creatorName: user.name,
      })
      .from(worldEvent)
      .innerJoin(user, eq(worldEvent.userId, user.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(worldEvent.timestamp))

    return rows.map(toWorldEvent)
  }

  async function getById(params: { id: WorldEventId }) {
    const rows = await db
      .select({
        ...getTableColumns(worldEvent),
        worldIdVerified: user.worldIdVerified,
        creatorName: user.name,
      })
      .from(worldEvent)
      .innerJoin(user, eq(worldEvent.userId, user.id))
      .where(eq(worldEvent.id, params.id))
      .limit(1)

    return rows[0] ? toWorldEvent(rows[0]) : null
  }

  async function create(params: {
    title: string
    description: string
    category: EventCategory
    severity: SeverityLevel
    latitude: number
    longitude: number
    location: string
    source?: string | null
    imageUrls?: string[]
    userId: UserId
    agentAddress?: string | null
    agentEnsName?: string | null
    erc8004AgentId?: string | null
    onChainVerified?: boolean
    corroboratesEventId?: WorldEventId | null
  }) {
    const canonicalEventId = params.corroboratesEventId ?? null

    const [row] = await db
      .insert(worldEvent)
      .values({
        title: params.title,
        description: params.description,
        category: params.category,
        severity: params.severity,
        latitude: params.latitude,
        longitude: params.longitude,
        location: params.location,
        timestamp: new Date(),
        source: params.source ?? null,
        imageUrls: params.imageUrls ?? [],
        userId: params.userId,
        agentAddress: params.agentAddress ? getAddress(params.agentAddress) : null,
        agentEnsName: params.agentEnsName ?? null,
        erc8004AgentId: params.erc8004AgentId ?? null,
        onChainVerified: params.onChainVerified ?? false,
        canonicalEventId,
      })
      .returning()

    // Increment corroboration count on canonical event
    if (canonicalEventId) {
      await db
        .update(worldEvent)
        .set({
          corroborationCount: sql`${worldEvent.corroborationCount} + 1`,
        })
        .where(eq(worldEvent.id, canonicalEventId))
    }

    const userRow = await db.query.user.findFirst({
      where: (u, { eq }) => eq(u.id, params.userId),
      columns: { worldIdVerified: true, name: true },
    })

    return toWorldEvent({
      ...row,
      worldIdVerified: userRow?.worldIdVerified ?? false,
      creatorName: userRow?.name ?? "Unknown",
    })
  }

  async function createDispute(params: {
    eventId: WorldEventId
    userId: UserId
    reason: DisputeReason
    justification?: string
    txHash?: string
  }) {
    const [dispute] = await db
      .insert(eventDispute)
      .values({
        eventId: params.eventId,
        userId: params.userId,
        reason: params.reason,
        justification: params.justification ?? null,
        txHash: params.txHash ?? null,
      })
      .returning()

    await db
      .update(worldEvent)
      .set({
        disputeCount: sql`${worldEvent.disputeCount} + 1`,
      })
      .where(eq(worldEvent.id, params.eventId))

    return dispute
  }

  async function getDisputes(params: { eventId: WorldEventId }) {
    return db.query.eventDispute.findMany({
      where: (d, { eq }) => eq(d.eventId, params.eventId),
      orderBy: (d, { desc }) => [desc(d.createdAt)],
    })
  }

  async function hasUserDisputed(params: {
    eventId: WorldEventId
    userId: UserId
  }): Promise<boolean> {
    const existing = await db.query.eventDispute.findFirst({
      where: (d, { eq, and }) =>
        and(eq(d.eventId, params.eventId), eq(d.userId, params.userId)),
      columns: { id: true },
    })
    return !!existing
  }

  async function getAgentActivity() {
    // Recent agent-submitted events
    const agentEvents = await db
      .select({
        id: worldEvent.id,
        agentEnsName: worldEvent.agentEnsName,
        agentAddress: worldEvent.agentAddress,
        eventTitle: worldEvent.title,
        eventId: worldEvent.id,
        createdAt: worldEvent.createdAt,
        canonicalEventId: worldEvent.canonicalEventId,
      })
      .from(worldEvent)
      .where(isNotNull(worldEvent.agentAddress))
      .orderBy(desc(worldEvent.createdAt))
      .limit(15)

    // Recent agent chat messages
    const agentMessages = await db
      .select({
        id: chatMessage.id,
        agentEnsName: chatMessage.agentEnsName,
        agentAddress: chatMessage.agentAddress,
        eventId: chatMessage.eventId,
        createdAt: chatMessage.createdAt,
      })
      .from(chatMessage)
      .where(isNotNull(chatMessage.agentAddress))
      .orderBy(desc(chatMessage.createdAt))
      .limit(10)

    // Merge and sort
    const activities = [
      ...agentEvents.map((e) => ({
        id: e.id,
        type: e.canonicalEventId ? ("corroborate" as const) : ("report" as const),
        agentEnsName: e.agentEnsName,
        agentAddress: e.agentAddress!,
        eventTitle: e.eventTitle,
        eventId: e.eventId,
        timestamp: e.createdAt.toISOString(),
      })),
      ...agentMessages.map((m) => ({
        id: m.id,
        type: "chat" as const,
        agentEnsName: m.agentEnsName,
        agentAddress: m.agentAddress!,
        eventTitle: null,
        eventId: m.eventId,
        timestamp: m.createdAt.toISOString(),
      })),
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20)

    return activities
  }

  return { getAll, getById, create, createDispute, getDisputes, hasUserDisputed, getAgentActivity }
}

export type EventService = ReturnType<typeof createEventService>
