import { Hono } from "hono"
import { HTTPFacilitatorClient } from "@x402/core/http"
import { ExactEvmScheme } from "@x402/evm/exact/server"
import {
  paymentMiddlewareFromHTTPServer,
  x402HTTPResourceServer,
  x402ResourceServer,
} from "@x402/hono"
import {
  agentkitResourceServerExtension,
  createAgentBookVerifier,
  createAgentkitHooks,
  declareAgentkitExtension,
  parseAgentkitHeader,
} from "@worldcoin/agentkit"
import type { AgentKitStorage } from "@worldcoin/agentkit"
import type { EvlogVariables } from "evlog/hono"
import { WorldEventId } from "@/lib/typeid"
import {
  createEventInputSchema,
  eventCategorySchema,
  severityLevelSchema,
} from "@/server/db/schema/event/event.zod"
import { createChatMessageInputSchema } from "@/server/db/schema/chat/chat.zod"
import { agentkitNonce } from "./db/schema/auth/auth.db"
import type { AuthService } from "./services/auth.service"
import type { EventService } from "./services/event.service"
import type { ChatService } from "./services/chat.service"
import type { RoutesConfig } from "@x402/core/server"
import type { UserId } from "@/lib/typeid"
import type { Database } from "./db/db"

const WORLD_CHAIN = "eip155:480" as const
const WORLD_USDC = "0x79A02482A880bCE3F13e09Da970dC34db4CD24d1"

type AgentEnv = EvlogVariables & {
  Variables: {
    userId: UserId
    userName: string
    agentAddress: string
  }
}

// --- DB-backed nonce storage (persists across restarts) ---
class DrizzleAgentKitStorage implements AgentKitStorage {
  constructor(private db: Database) {}

  async tryIncrementUsage(
    _endpoint: string,
    _humanId: string,
    _limit: number
  ): Promise<boolean> {
    // Free mode — never called, but interface requires it
    return true
  }

  async hasUsedNonce(nonce: string): Promise<boolean> {
    const row = await this.db.query.agentkitNonce.findFirst({
      where: (n, { eq }) => eq(n.nonce, nonce),
    })
    return !!row
  }

  async recordNonce(nonce: string): Promise<void> {
    await this.db
      .insert(agentkitNonce)
      .values({ nonce })
      .onConflictDoNothing()
  }
}

export function createAgentApp(props: {
  db: Database
  eventService: EventService
  chatService: ChatService
  authService: AuthService
  payTo: string
}) {
  const { db, eventService, chatService, authService, payTo } = props

  // --- AgentKit setup ---
  const agentBook = createAgentBookVerifier()
  const storage = new DrizzleAgentKitStorage(db)

  const hooks = createAgentkitHooks({
    agentBook,
    storage,
    mode: { type: "free" },
  })

  const facilitatorClient = new HTTPFacilitatorClient({
    url: "https://x402-worldchain.vercel.app/facilitator",
  })

  const evmScheme = new ExactEvmScheme().registerMoneyParser(
    async (amount, network) => {
      if (network !== WORLD_CHAIN) return null
      return {
        amount: String(Math.round(amount * 1e6)),
        asset: WORLD_USDC,
        extra: { name: "USD Coin", version: "2" },
      }
    }
  )

  const agentExt = declareAgentkitExtension({
    statement: "Access Ground Truth API as a verified human-backed agent",
    mode: { type: "free" },
  })

  const accepts = [
    { scheme: "exact" as const, price: "$0.01", network: WORLD_CHAIN, payTo },
  ]

  const routes = {
    "GET /api/agent/events": { accepts, extensions: agentExt },
    "GET /api/agent/events/:id": { accepts, extensions: agentExt },
    "POST /api/agent/events": { accepts, extensions: agentExt },
    "GET /api/agent/chat": { accepts, extensions: agentExt },
    "POST /api/agent/chat": { accepts, extensions: agentExt },
  } satisfies RoutesConfig

  const resourceServer = new x402ResourceServer(facilitatorClient)
    .register(WORLD_CHAIN, evmScheme)
    .registerExtension(agentkitResourceServerExtension)

  const httpServer = new x402HTTPResourceServer(
    resourceServer,
    routes
  ).onProtectedRequest(hooks.requestHook)

  // --- Hono sub-app ---
  const app = new Hono<AgentEnv>()

  // Error handler — clean JSON for Zod parse errors etc.
  app.onError((error, c) => {
    const log = c.get("log")
    log?.error(error)

    if (error.name === "ZodError" || error.name === "SyntaxError") {
      return c.json({ error: "Invalid input", details: error.message }, 400)
    }
    return c.json({ error: error.message ?? "Internal error" }, 500)
  })

  // x402 + AgentKit middleware
  app.use("*", paymentMiddlewareFromHTTPServer(httpServer))

  // Resolve agent wallet → userId + userName for write ops
  app.use("*", async (c, next) => {
    try {
      const header = c.req.header("agentkit")
      if (header) {
        const payload = parseAgentkitHeader(header)
        c.set("agentAddress", payload.address)
        const result = await authService.getUserByAgentAddress({
          address: payload.address,
        })
        if (result) {
          c.set("userId", result.userId)
          c.set("userName", result.userName)
        }
      }
    } catch (err) {
      const log = c.get("log")
      log?.set({ agentResolveError: String(err) })
    }
    await next()
  })

  // --- Routes ---

  app.get("/events", async (c) => {
    const log = c.get("log")
    log?.set({ route: "agent.events.list" })

    const query = c.req.query()
    const category = query.category
      ? eventCategorySchema.parse(query.category)
      : undefined
    const severity = query.severity
      ? severityLevelSchema.parse(query.severity)
      : undefined
    const events = await eventService.getAll({
      category,
      severity,
      search: query.search,
    })
    return c.json(events)
  })

  app.get("/events/:id", async (c) => {
    const log = c.get("log")
    log?.set({ route: "agent.events.getById" })

    const id = WorldEventId.parse(c.req.param("id"))
    const event = await eventService.getById({ id })
    if (!event) return c.json({ error: "Event not found" }, 404)
    return c.json(event)
  })

  app.post("/events", async (c) => {
    const log = c.get("log")
    log?.set({ route: "agent.events.create" })

    const userId = c.get("userId")
    if (!userId) return c.json({ error: "Agent not linked to a user" }, 403)

    const body = createEventInputSchema.parse(await c.req.json())
    const agentAddress = c.get("agentAddress")
    const event = await eventService.create({ ...body, userId, agentAddress })
    return c.json(event, 201)
  })

  app.get("/chat", async (c) => {
    const log = c.get("log")
    log?.set({ route: "agent.chat.list" })

    const query = c.req.query()
    const eventId = query.eventId
      ? WorldEventId.parse(query.eventId)
      : undefined
    const limit = query.limit ? Number(query.limit) : undefined
    const messages = await chatService.getMessages({
      eventId: eventId ?? null,
      limit,
    })
    return c.json(messages)
  })

  app.post("/chat", async (c) => {
    const log = c.get("log")
    log?.set({ route: "agent.chat.send" })

    const userId = c.get("userId")
    if (!userId) return c.json({ error: "Agent not linked to a user" }, 403)

    const userName = c.get("userName") ?? "Agent"
    const agentAddress = c.get("agentAddress")
    const body = createChatMessageInputSchema.parse(await c.req.json())
    const message = await chatService.create({
      eventId: body.eventId ?? null,
      content: body.content,
      authorName: userName,
      userId,
      agentAddress,
    })
    return c.json(message, 201)
  })

  return app
}
