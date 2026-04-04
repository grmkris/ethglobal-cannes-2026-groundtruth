import "dotenv/config"
import { createDb } from "./db"
import { worldEvent } from "./schema/event/event.db"
import { chatMessage } from "./schema/chat/chat.db"
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

  logger.info("Deleting existing data...")
  await db.delete(chatMessage)
  await db.delete(worldEvent)

  logger.info("Seeding world events...")
  const insertedEvents = await db
    .insert(worldEvent)
    .values(
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
    .returning({ id: worldEvent.id })

  logger.info("Seeding chat messages...")
  const globalMessages = [
    { authorName: "Observer", content: "Anyone tracking the situation in Eastern Europe?" },
    { authorName: "FieldWatch", content: "Multiple sources confirming escalation near the border" },
    { authorName: "Anon", content: "The earthquake warnings for Japan are concerning" },
    { authorName: "ClimateBot", content: "Arctic ice data looking worse than projections" },
    { authorName: "Observer", content: "WHO alert level raised — this could be significant" },
    { authorName: "InfoHunter", content: "Can anyone verify the undersea cable reports?" },
    { authorName: "Anon", content: "Protests in Nairobi growing — livestreams showing massive crowds" },
    { authorName: "FieldWatch", content: "OPEC decision expected to impact markets within hours" },
  ]

  await db.insert(chatMessage).values(
    globalMessages.map((m, i) => ({
      eventId: null,
      authorName: m.authorName,
      content: m.content,
    }))
  )

  // Add per-event messages to first 3 events
  if (insertedEvents.length >= 3) {
    const eventChats = [
      { eventId: insertedEvents[0].id, authorName: "LocalSource", content: "Talks broke down at 3am local time" },
      { eventId: insertedEvents[0].id, authorName: "Analyst", content: "This was expected after last week's provocation" },
      { eventId: insertedEvents[1].id, authorName: "NavalWatch", content: "3 carrier groups now in the area" },
      { eventId: insertedEvents[2].id, authorName: "SahelTracker", content: "Military convoys spotted heading south" },
    ]

    await db.insert(chatMessage).values(eventChats)
  }

  logger.info("Seed complete", {
    events: insertedEvents.length,
    globalMessages: globalMessages.length,
  })
  process.exit(0)
}

seed().catch((err) => {
  logger.error("Seed failed", { error: String(err) })
  process.exit(1)
})
