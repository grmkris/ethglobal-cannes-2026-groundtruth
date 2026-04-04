import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger as honoLogger } from "hono/logger"
import { RPCHandler } from "@orpc/server/fetch"
import { createContext } from "./api/context"
import { appRouter } from "./api/router"
import { eventService, logger } from "./instance"

const rpcHandler = new RPCHandler(appRouter)

const app = new Hono().basePath("/api")

app.use("*", cors())
app.use("*", honoLogger())

app.get("/health", (c) => c.json({ status: "ok" }))

app.all("/rpc/*", async (c) => {
  const context = await createContext({
    logger,
    eventService,
  })

  const { matched, response } = await rpcHandler.handle(c.req.raw, {
    prefix: "/api/rpc",
    context,
  })

  if (matched) return response
  return c.notFound()
})

export { app }
