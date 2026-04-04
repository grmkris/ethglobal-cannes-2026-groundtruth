import type { RouterClient } from "@orpc/server"
import { publicProcedure } from "./api"
import { eventRouter } from "./routers/event.router"

export const appRouter = {
  healthCheck: publicProcedure.handler(() => "OK"),
  event: eventRouter,
}

export type AppRouter = typeof appRouter
export type AppRouterClient = RouterClient<typeof appRouter>
