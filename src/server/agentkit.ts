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
  InMemoryAgentKitStorage,
  parseAgentkitHeader,
} from "@worldcoin/agentkit"
import { z } from "zod"
import { WorldEventId } from "@/lib/typeid"
import {
  createEventInputSchema,
  eventCategorySchema,
  severityLevelSchema,
} from "@/server/db/schema/event/event.zod"
import { createChatMessageInputSchema } from "@/server/db/schema/chat/chat.zod"
import type { AuthService } from "./services/auth.service"
import type { EventService } from "./services/event.service"
import type { ChatService } from "./services/chat.service"
import type { RoutesConfig } from "@x402/core/server"
import type { UserId } from "@/lib/typeid"

const WORLD_CHAIN = "eip155:480" as const
const WORLD_USDC = "0x79A02482A880bCE3F13e09Da970dC34db4CD24d1"

type AgentEnv = {
  Variables: {
    humanId: string
    userId: UserId
  }
}

export function createAgentApp(props: {
  eventService: EventService
  chatService: ChatService
  authService: AuthService
  payTo: string
}) {
  const { eventService, chatService, authService, payTo } = props

  // --- AgentKit setup ---
  const agentBook = createAgentBookVerifier()
  const storage = new InMemoryAgentKitStorage()

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
    "GET /events": { accepts, extensions: agentExt },
    "GET /events/:id": { accepts, extensions: agentExt },
    "POST /events": { accepts, extensions: agentExt },
    "GET /chat": { accepts, extensions: agentExt },
    "POST /chat": { accepts, extensions: agentExt },
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

  // x402 + AgentKit middleware
  app.use("*", paymentMiddlewareFromHTTPServer(httpServer))

  // After x402 grants access, resolve the agent's humanId for write ops
  app.use("*", async (c, next) => {
    try {
      const header = c.req.header("agentkit")
      if (header) {
        const payload = parseAgentkitHeader(header)
        const humanId = await agentBook.lookupHuman(
          payload.address,
          payload.chainId
        )
        if (humanId) {
          c.set("humanId", humanId)
          const userId = await authService.getUserByHumanId({ humanId })
          if (userId) c.set("userId", userId)
        }
      }
    } catch {
      // Non-critical — read endpoints don't need humanId
    }
    await next()
  })

  // --- Routes ---

  // GET /events
  app.get("/events", async (c) => {
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

  // GET /events/:id
  app.get("/events/:id", async (c) => {
    const id = WorldEventId.parse(c.req.param("id"))
    const event = await eventService.getById({ id })
    if (!event) return c.json({ error: "Event not found" }, 404)
    return c.json(event)
  })

  // POST /events
  app.post("/events", async (c) => {
    const userId = c.get("userId")
    if (!userId) return c.json({ error: "Agent not linked to a user" }, 403)

    const body = createEventInputSchema.parse(await c.req.json())
    const event = await eventService.create({ ...body, userId })
    return c.json(event, 201)
  })

  // GET /chat
  app.get("/chat", async (c) => {
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

  // POST /chat
  app.post("/chat", async (c) => {
    const userId = c.get("userId")
    if (!userId) return c.json({ error: "Agent not linked to a user" }, 403)

    const body = createChatMessageInputSchema.parse(await c.req.json())
    const message = await chatService.create({
      eventId: body.eventId ?? null,
      content: body.content,
      authorName: "Agent",
      userId,
    })
    return c.json(message, 201)
  })

  return app
}
