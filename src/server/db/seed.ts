import "dotenv/config"
import { sql } from "drizzle-orm"
import { createDb } from "./db"
import { worldEvent } from "./schema/event/event.db"

async function seed() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error("DATABASE_URL is required")
    process.exit(1)
  }

  const db = createDb({ databaseUrl })

  const { MOCK_EVENTS } = await import("../../lib/mock-events")

  console.log("Truncating world_event table...")
  await db.execute(sql`TRUNCATE TABLE world_event`)

  console.log("Seeding world events...")
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

  console.log(`Seeded ${MOCK_EVENTS.length} events.`)
  process.exit(0)
}

seed().catch((err) => {
  console.error("Seed failed:", err)
  process.exit(1)
})
