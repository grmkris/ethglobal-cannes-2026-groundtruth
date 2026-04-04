import type { EventService } from "../services/event.service"
import type { Logger } from "../logger"

export interface ContextOptions {
  logger: Logger
  eventService: EventService
}

export async function createContext(options: ContextOptions) {
  return {
    logger: options.logger,
    eventService: options.eventService,
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>
