import { Hono } from "hono"
import { cors } from "hono/cors"
import { createError, parseError } from "evlog"
import { evlog, type EvlogVariables } from "evlog/hono"
import type { ContentfulStatusCode } from "hono/utils/http-status"
import { RPCHandler } from "@orpc/server/fetch"
import { createContext } from "./api/context"
import { appRouter } from "./api/router"
import { createAuth } from "./auth"
import { createAuthService } from "./services/auth.service"
import { createEventService } from "./services/event.service"
import { createChatService } from "./services/chat.service"
import { worldIdVerifyInputSchema } from "./db/schema/auth/auth.zod"
import { env } from "@/env"
import { UserId } from "@/lib/typeid"
import type { Database } from "./db/db"

export function createApi(props: { db: Database }) {
  const { db } = props

  // --- Services ---
  const authService = createAuthService({ db })
  const eventService = createEventService({ db })
  const chatService = createChatService({ db })

  // --- Auth ---
  const auth = createAuth({
    db,
    secret: env.BETTER_AUTH_SECRET,
    domain: env.AUTH_DOMAIN,
    baseURL: env.APP_URL,
  })

  // --- Hono app with evlog wide events ---
  const app = new Hono<EvlogVariables>().basePath("/api")

  app.use("*", cors())
  app.use("*", evlog({ exclude: ["/api/health"] }))

  // Structured error handler
  app.onError((error, c) => {
    c.get("log").error(error)
    const parsed = parseError(error)
    const status = (parsed.status >= 100 && parsed.status < 600
      ? parsed.status
      : 500) as ContentfulStatusCode
    return c.json(
      { message: parsed.message, why: parsed.why, fix: parsed.fix },
      status
    )
  })

  app.get("/health", (c) => c.json({ status: "ok" }))

  // Better Auth handles /api/auth/*
  app.all("/auth/*", async (c) => auth.handler(c.req.raw))

  // World ID verification
  app.post("/auth/verify-world-id", async (c) => {
    const log = c.get("log")
    log.set({ action: "verify-world-id" })

    const session = await auth.api.getSession({ headers: c.req.raw.headers })
    if (!session) {
      throw createError({ message: "Not authenticated", status: 401 })
    }

    const { proof, nullifier } = worldIdVerifyInputSchema.parse(
      await c.req.json()
    )
    const userId = UserId.parse(session.user.id)
    log.set({ userId })

    if (!env.WORLD_APP_ID) {
      throw createError({
        message: "World App not configured",
        status: 500,
        why: "WORLD_APP_ID environment variable is not set",
      })
    }

    const res = await fetch(
      `https://developer.world.org/api/v4/verify/${env.WORLD_APP_ID}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proof, nullifier, action: "verify-human" }),
      }
    )

    if (!res.ok) {
      throw createError({
        message: "World ID verification failed",
        status: 400,
        why: "The World API rejected the verification proof",
      })
    }

    await authService.verifyWorldId({ userId, nullifierHash: nullifier })

    log.set({ verified: true })
    return c.json({ verified: true })
  })

  // oRPC handler
  const rpcHandler = new RPCHandler(appRouter)
  app.all("/rpc/*", async (c) => {
    const log = c.get("log")
    const context = createContext({
      log,
      auth,
      authService,
      eventService,
      chatService,
    })

    const { matched, response } = await rpcHandler.handle(c.req.raw, {
      prefix: "/api/rpc",
      context,
    })

    if (matched) return response
    return c.notFound()
  })

  return { app, auth, db }
}
