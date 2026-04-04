import { and, desc, eq, getTableColumns, ilike, or, type SQL } from "drizzle-orm"
import type { UserId, WorldEventId } from "@/lib/typeid"
import type { Database } from "../db/db"
import type {
  EventCategory,
  SeverityLevel,
  WorldEventResponse,
} from "@/server/db/schema/event/event.zod"
import { worldEvent } from "../db/schema/event/event.db"
import { user } from "../db/schema/auth/auth.db"

function toWorldEvent(
  row: typeof worldEvent.$inferSelect & { worldIdVerified: boolean }
): WorldEventResponse {
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
  }) {
    const [row] = await db
      .insert(worldEvent)
      .values({
        ...params,
        timestamp: new Date(),
        source: params.source ?? null,
        imageUrls: params.imageUrls ?? [],
        userId: params.userId,
      })
      .returning()

    const userRow = await db.query.user.findFirst({
      where: (u, { eq }) => eq(u.id, params.userId),
      columns: { worldIdVerified: true },
    })

    return toWorldEvent({
      ...row,
      worldIdVerified: userRow?.worldIdVerified ?? false,
    })
  }

  return { getAll, getById, create }
}

export type EventService = ReturnType<typeof createEventService>
