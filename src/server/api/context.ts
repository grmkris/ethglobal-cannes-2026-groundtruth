import type { RequestLogger } from "evlog"
import type { Auth } from "../auth"
import type { AuthService } from "../services/auth.service"
import type { ChatService } from "../services/chat.service"
import type { EventService } from "../services/event.service"

export function createContext(props: {
  log: RequestLogger
  auth: Auth
  authService: AuthService
  eventService: EventService
  chatService: ChatService
}) {
  return {
    log: props.log,
    auth: props.auth,
    authService: props.authService,
    eventService: props.eventService,
    chatService: props.chatService,
  }
}

export type Context = ReturnType<typeof createContext>
