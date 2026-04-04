import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm"
import type { WorldEventId } from "@/lib/typeid"
import type { Database } from "../db/db"
import type {
  EventCategory,
  SeverityLevel,
  WorldEventResponse,
} from "@/server/db/schema/event/event.zod"
import { worldEvent } from "../db/schema/event/event.db"
import type { Logger } from "../logger"

function toWorldEvent(row: typeof worldEvent.$inferSelect): WorldEventResponse {
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
  }
}

export function createEventService(props: { db: Database; logger: Logger }) {
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

    return (
      await db
        .select()
        .from(worldEvent)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(worldEvent.timestamp))
    ).map(toWorldEvent)
  }

  async function getById(params: { id: WorldEventId }) {
    const row = await db.query.worldEvent.findFirst({
      where: eq(worldEvent.id, params.id),
    })
    return row ? toWorldEvent(row) : null
  }

  return { getAll, getById }
}

export type EventService = ReturnType<typeof createEventService>
