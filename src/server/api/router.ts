import type { RouterClient } from "@orpc/server"
import { publicProcedure } from "./api"
import { chatRouter } from "./routers/chat.router"
import { eventRouter } from "./routers/event.router"
import { worldIdRouter } from "./routers/world-id.router"

export const appRouter = {
  healthCheck: publicProcedure.handler(() => "OK"),
  event: eventRouter,
  chat: chatRouter,
  worldId: worldIdRouter,
}

export type AppRouter = typeof appRouter
export type AppRouterClient = RouterClient<typeof appRouter>
