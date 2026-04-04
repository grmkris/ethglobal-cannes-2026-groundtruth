import { Hono } from "hono"
import { cors } from "hono/cors"
import { createError, parseError } from "evlog"
import { evlog, type EvlogVariables } from "evlog/hono"
import type { ContentfulStatusCode } from "hono/utils/http-status"
import { RPCHandler } from "@orpc/server/fetch"
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"
import { UPLOAD_MAX_SIZE_BYTES, UPLOAD_ALLOWED_TYPES } from "@/lib/upload-config"
import { createContext } from "./api/context"
import { appRouter } from "./api/router"
import { createAuth } from "./auth"
import { createAuthService } from "./services/auth.service"
import { createEventService } from "./services/event.service"
import { createChatService } from "./services/chat.service"
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

  // Image upload (Vercel Blob client-upload pattern)
  app.post("/upload", async (c) => {
    const log = c.get("log")
    log.set({ action: "upload" })

    const session = await auth.api.getSession({ headers: c.req.raw.headers })
    if (!session) {
      throw createError({ message: "Not authenticated", status: 401 })
    }
    const userId = UserId.parse(session.user.id)
    log.set({ userId })

    const body = (await c.req.json()) as HandleUploadBody

    const jsonResponse = await handleUpload({
      body,
      request: c.req.raw,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [...UPLOAD_ALLOWED_TYPES],
        maximumSizeInBytes: UPLOAD_MAX_SIZE_BYTES,
        addRandomSuffix: true,
      }),
      onUploadCompleted: async () => {},
    })

    return c.json(jsonResponse)
  })

  // oRPC handler
  const rpcHandler = new RPCHandler(appRouter)
  app.all("/rpc/*", async (c) => {
    const log = c.get("log")
    const session = await auth.api.getSession({ headers: c.req.raw.headers })
    const context = createContext({
      log,
      auth,
      authService,
      eventService,
      chatService,
      session,
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
