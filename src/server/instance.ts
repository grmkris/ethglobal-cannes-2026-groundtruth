import { createDb } from "@/server/db/db"
import { env } from "@/server/env"
import { createLogger } from "@/server/logger"
import { createChatService } from "@/server/services/chat.service"
import { createEventService } from "@/server/services/event.service"

export const logger = createLogger("app")
export const db = createDb({ databaseUrl: env.DATABASE_URL })
export const eventService = createEventService({ db, logger })
export const chatService = createChatService({ db, logger })
