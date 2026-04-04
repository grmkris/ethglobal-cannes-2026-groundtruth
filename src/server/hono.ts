import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger as honoLogger } from "hono/logger"
import { RPCHandler } from "@orpc/server/fetch"
import { eq } from "drizzle-orm"
import { createContext } from "./api/context"
import { appRouter } from "./api/router"
import { chatService, eventService, logger } from "./instance"
import { auth } from "./auth"
import { db } from "./db/db"
import * as schema from "./db/schema/schema"

const rpcHandler = new RPCHandler(appRouter)

const app = new Hono().basePath("/api")

app.use("*", cors())
app.use("*", honoLogger())

app.get("/health", (c) => c.json({ status: "ok" }))

// --- Better Auth: handles /api/auth/* (SIWE, sessions, etc.) ---
app.all("/auth/*", async (c) => {
  return auth.handler(c.req.raw)
})

// --- World ID verification: upgrades session with verified badge ---
app.post("/auth/verify-world-id", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) {
    return c.json({ error: "Not authenticated" }, 401)
  }

  const { proof, nullifier } = await c.req.json()

  // Verify with World API
  const worldAppId = process.env.WORLD_APP_ID
  if (!worldAppId) {
    return c.json({ error: "World App not configured" }, 500)
  }

  const res = await fetch(
    `https://developer.world.org/api/v4/verify/${worldAppId}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proof, nullifier, action: "verify-human" }),
    }
  )

  if (!res.ok) {
    return c.json({ error: "World ID verification failed" }, 400)
  }

  // Store nullifier (prevents same human verifying twice)
  await db.insert(schema.worldIdVerification).values({
    nullifierHash: nullifier,
    userId: session.user.id,
  })

  // Update user record
  await db
    .update(schema.user)
    .set({ worldIdVerified: true })
    .where(eq(schema.user.id, session.user.id))

  return c.json({ verified: true })
})

// --- ORPC RPC handler ---
app.all("/rpc/*", async (c) => {
  const context = createContext({
    logger,
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

export { app }
