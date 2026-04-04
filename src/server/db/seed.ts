import "dotenv/config"
import { createDb } from "./db"
import { worldEvent } from "./schema/event/event.db"
import { MOCK_EVENTS } from "../../lib/mock-events"
import { createLogger } from "../logger"

const logger = createLogger("seed")

async function seed() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    logger.error("DATABASE_URL is required")
    process.exit(1)
  }

  const db = createDb({ databaseUrl })

  logger.info("Deleting existing events...")
  await db.delete(worldEvent)

  logger.info("Seeding world events...")
  await db.insert(worldEvent).values(
    MOCK_EVENTS.map((e) => ({
      title: e.title,
      description: e.description,
      category: e.category,
      severity: e.severity,
      latitude: e.coordinates[0],
      longitude: e.coordinates[1],
      location: e.location,
      timestamp: new Date(e.timestamp),
      source: e.source,
    }))
  )

  logger.info("Seed complete", { count: MOCK_EVENTS.length })
  process.exit(0)
}

seed().catch((err) => {
  logger.error("Seed failed", { error: String(err) })
  process.exit(1)
})
