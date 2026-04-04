import type { EventService } from "../services/event.service"
import type { Logger } from "../logger"

export function createContext(props: {
  logger: Logger
  eventService: EventService
}) {
  return {
    logger: props.logger,
    eventService: props.eventService,
  }
}

export type Context = ReturnType<typeof createContext>
