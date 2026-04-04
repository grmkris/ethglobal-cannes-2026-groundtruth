import type { ChatService } from "../services/chat.service"
import type { EventService } from "../services/event.service"
import type { Logger } from "../logger"

export function createContext(props: {
  logger: Logger
  eventService: EventService
  chatService: ChatService
}) {
  return {
    logger: props.logger,
    eventService: props.eventService,
    chatService: props.chatService,
  }
}

export type Context = ReturnType<typeof createContext>
