import "dotenv/config"
import { eq } from "drizzle-orm"
import { log } from "@/lib/evlog"
import { createDb } from "./db"
import { worldEvent } from "./schema/event/event.db"
import { chatMessage } from "./schema/chat/chat.db"
import { user } from "./schema/auth/auth.db"
import { MOCK_EVENTS } from "../../lib/mock-events"
import { env } from "../../env"

const SYSTEM_EMAIL = "system@groundtruth.app"

async function getOrCreateSystemUser(db: ReturnType<typeof createDb>) {
  const existing = await db.query.user.findFirst({
    where: eq(user.email, SYSTEM_EMAIL),
  })
  if (existing) return existing

  const [created] = await db
    .insert(user)
    .values({ name: "Ground Truth", email: SYSTEM_EMAIL, emailVerified: false })
    .returning()
  return created
}

async function seed() {
  const db = createDb({ databaseUrl: env.DATABASE_URL })

  log.info({ msg: "Deleting existing data...", service: "seed" })
  await db.delete(chatMessage)
  await db.delete(worldEvent)

  const systemUser = await getOrCreateSystemUser(db)
  log.info({ msg: "System user ready", service: "seed", userId: systemUser.id })

  log.info({ msg: "Seeding world events...", service: "seed" })
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
        userId: systemUser.id,
      }))
    )
    .returning({ id: worldEvent.id })

  log.info({ msg: "Seeding chat messages...", service: "seed" })
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
    globalMessages.map((m) => ({
      eventId: null,
      authorName: m.authorName,
      content: m.content,
      userId: systemUser.id,
    }))
  )

  if (insertedEvents.length >= 3) {
    await db.insert(chatMessage).values([
      { eventId: insertedEvents[0].id, authorName: "LocalSource", content: "Talks broke down at 3am local time", userId: systemUser.id },
      { eventId: insertedEvents[0].id, authorName: "Analyst", content: "This was expected after last week's provocation", userId: systemUser.id },
      { eventId: insertedEvents[1].id, authorName: "NavalWatch", content: "3 carrier groups now in the area", userId: systemUser.id },
      { eventId: insertedEvents[2].id, authorName: "SahelTracker", content: "Military convoys spotted heading south", userId: systemUser.id },
    ])
  }

  log.info({
    msg: "Seed complete",
    service: "seed",
    events: insertedEvents.length,
    globalMessages: globalMessages.length,
  })
  process.exit(0)
}

seed().catch((err) => {
  log.error({ msg: "Seed failed", service: "seed", error: String(err) })
  process.exit(1)
})
