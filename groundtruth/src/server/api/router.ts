import type { RouterClient } from "@orpc/server"
import { publicProcedure } from "./api"
import { agentRouter } from "./routers/agent.router"
import { chatRouter } from "./routers/chat.router"
import { eventRouter } from "./routers/event.router"
import { paymentRouter } from "./routers/payment.router"
import { worldIdRouter } from "./routers/world-id.router"

export const appRouter = {
  healthCheck: publicProcedure.handler(() => "OK"),
  event: eventRouter,
  chat: chatRouter,
  worldId: worldIdRouter,
  agent: agentRouter,
  payment: paymentRouter,
}

export type AppRouter = typeof appRouter
export type AppRouterClient = RouterClient<typeof appRouter>
