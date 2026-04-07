import { and, desc, eq, getTableColumns, ilike, inArray, isNotNull, lt, or, sql, type SQL } from "drizzle-orm"
import { getAddress, type Hex } from "viem"
import type { UserId, WorldEventId } from "@/lib/typeid"
import type { Database } from "../db/db"
import type {
  EventCategory,
  SeverityLevel,
  WorldEventResponse,
} from "@/server/db/schema/event/event.zod"
import { worldEvent, eventDispute, type DisputeReason } from "../db/schema/event/event.db"
import { chatMessage } from "../db/schema/chat/chat.db"
import { user, paymentLedger } from "../db/schema/auth/auth.db"
import { computeConfidence } from "@/lib/confidence"
import type { AttestationService } from "./attestation.service"
import type { EasAttestation } from "../db/schema/attestation/attestation.db"
import { CORROBORATION_SCHEMA, DISPUTE_SCHEMA } from "@/lib/eas"

function toWorldEvent(
  row: typeof worldEvent.$inferSelect & { worldIdVerified: boolean; creatorName: string },
  attestations?: { corroborations: EasAttestation[]; disputes: EasAttestation[] }
): WorldEventResponse {
  const confidence = computeConfidence({
    corroborationCount: row.corroborationCount,
    disputeCount: row.disputeCount,
    worldIdVerified: row.worldIdVerified,
    onChainVerified: row.onChainVerified,
    source: row.source,
    corroborationAttestations: attestations?.corroborations,
    disputeAttestations: attestations?.disputes,
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

export function createEventService(props: {
  db: Database
  attestationService: AttestationService
}) {
  const { db, attestationService } = props

  /**
   * Fetch the EAS corroboration + dispute attestations for an event.
   * Returns empty arrays on failure — the caller falls back to
   * counter-based confidence in that case.
   */
  async function fetchEventAttestations(eventId: WorldEventId): Promise<{
    corroborations: EasAttestation[]
    disputes: EasAttestation[]
  }> {
    try {
      const [corroborations, disputes] = await Promise.all([
        attestationService.listForRef({
          refType: "event",
          refId: eventId,
          schemaUid: CORROBORATION_SCHEMA.uid as Hex,
        }),
        attestationService.listForRef({
          refType: "event",
          refId: eventId,
          schemaUid: DISPUTE_SCHEMA.uid as Hex,
        }),
      ])
      return { corroborations, disputes }
    } catch (err) {
      console.warn("[event] fetchEventAttestations failed", err)
      return { corroborations: [], disputes: [] }
    }
  }

  async function getAll(params?: {
    category?: EventCategory | EventCategory[]
    severity?: SeverityLevel
    search?: string
    limit?: number
    cursor?: WorldEventId
  }) {
    const conditions: SQL[] = []
    const limit = params?.limit ? Math.min(params.limit, 200) : undefined

    if (params?.category) {
      if (Array.isArray(params.category)) {
        conditions.push(inArray(worldEvent.category, params.category))
      } else {
        conditions.push(eq(worldEvent.category, params.category))
      }
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

    if (params?.cursor) {
      const cursorRow = await db.query.worldEvent.findFirst({
        where: eq(worldEvent.id, params.cursor),
        columns: { timestamp: true },
      })
      if (cursorRow) {
        conditions.push(lt(worldEvent.timestamp, cursorRow.timestamp))
      }
    }

    const baseQuery = db
      .select({
        ...getTableColumns(worldEvent),
        worldIdVerified: user.worldIdVerified,
        creatorName: user.name,
      })
      .from(worldEvent)
      .innerJoin(user, eq(worldEvent.userId, user.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(worldEvent.timestamp))

    const rows = limit
      ? await baseQuery.limit(limit + 1)
      : await baseQuery

    if (limit) {
      const hasMore = rows.length > limit
      const items = rows.slice(0, limit).map(toWorldEvent)
      const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null
      return { items, nextCursor }
    }

    return { items: rows.map(toWorldEvent), nextCursor: null }
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

    if (!rows[0]) return null
    // Detail view: hydrate confidence from attestations when available.
    const attestations = await fetchEventAttestations(params.id)
    return toWorldEvent(rows[0], attestations)
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
    attestationUid?: string
  }) {
    const [dispute] = await db
      .insert(eventDispute)
      .values({
        eventId: params.eventId,
        userId: params.userId,
        reason: params.reason,
        justification: params.justification ?? null,
        txHash: params.txHash ?? null,
        attestationUid: params.attestationUid ?? null,
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

    // Recent paid API calls (x402 nanopayments)
    const paidCalls = await db
      .select({
        id: paymentLedger.id,
        payerAddress: paymentLedger.payerAddress,
        amountUsd: paymentLedger.amountUsd,
        category: paymentLedger.category,
        createdAt: paymentLedger.createdAt,
      })
      .from(paymentLedger)
      .orderBy(desc(paymentLedger.createdAt))
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
      ...paidCalls.map((p) => ({
        id: p.id,
        type: "paid" as const,
        agentEnsName: null as string | null,
        agentAddress: p.payerAddress,
        eventTitle: `$${p.amountUsd} \u2192 ${p.category ?? "data"}`,
        eventId: null as string | null,
        timestamp: p.createdAt.toISOString(),
      })),
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20)

    return activities
  }

  return { getAll, getById, create, createDispute, getDisputes, hasUserDisputed, getAgentActivity }
}

export type EventService = ReturnType<typeof createEventService>
