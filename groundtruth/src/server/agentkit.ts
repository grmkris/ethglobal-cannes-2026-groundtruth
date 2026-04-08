import { Hono } from "hono"
import { BatchFacilitatorClient, GatewayEvmScheme } from "@circle-fin/x402-batching/server"
import {
  paymentMiddlewareFromHTTPServer,
  x402HTTPResourceServer,
  x402ResourceServer,
} from "@x402/hono"
import {
  agentkitResourceServerExtension,
  declareAgentkitExtension,
  parseAgentkitHeader,
  validateAgentkitMessage,
  verifyAgentkitSignature,
} from "@worldcoin/agentkit"
import type { AgentKitStorage } from "@worldcoin/agentkit"
import type { EvlogVariables } from "evlog/hono"
import { put } from "@vercel/blob"
import { UPLOAD_ALLOWED_TYPES, UPLOAD_MAX_SIZE_BYTES } from "@/lib/upload-config"
import { WorldEventId } from "@/lib/typeid"
import {
  createEventInputSchema,
  eventCategorySchema,
  severityLevelSchema,
} from "@/server/db/schema/event/event.zod"
import { createChatMessageInputSchema } from "@/server/db/schema/chat/chat.zod"
import { eq, and } from "drizzle-orm"
import { agentkitNonce, agentkitUsage } from "./db/schema/auth/auth.db"
import type { AuthService } from "./services/auth.service"
import type { EventService } from "./services/event.service"
import type { ChatService } from "./services/chat.service"
import type { PaymentService } from "./services/payment.service"
import type { RoutesConfig } from "@x402/core/server"
import type { UserId } from "@/lib/typeid"
import type { Database } from "./db/db"

const ARC_TESTNET = "eip155:5042002" as const

type AgentEnv = EvlogVariables & {
  Variables: {
    userId: UserId
    userName: string
    agentAddress: string
    agentEnsName: string | null
    erc8004AgentId: string | null
    onChainVerified: boolean
  }
}

// --- DB-backed nonce storage (persists across restarts) ---
class DrizzleAgentKitStorage implements AgentKitStorage {
  constructor(private db: Database) {}

  async tryIncrementUsage(
    endpoint: string,
    humanId: string,
    limit: number
  ): Promise<boolean> {
    const existing = await this.db.query.agentkitUsage.findFirst({
      where: (u, { eq, and }) => and(eq(u.humanId, humanId), eq(u.endpoint, endpoint)),
    })

    const ONE_HOUR = 60 * 60 * 1000

    if (!existing) {
      await this.db.insert(agentkitUsage).values({
        humanId, endpoint, usageCount: 1, windowStart: new Date(),
      })
      return true
    }

    // Reset window if expired (3 free per hour)
    if (Date.now() - existing.windowStart.getTime() > ONE_HOUR) {
      await this.db
        .update(agentkitUsage)
        .set({ usageCount: 1, windowStart: new Date() })
        .where(and(eq(agentkitUsage.humanId, humanId), eq(agentkitUsage.endpoint, endpoint)))
      return true
    }

    if (existing.usageCount < limit) {
      await this.db
        .update(agentkitUsage)
        .set({ usageCount: existing.usageCount + 1 })
        .where(and(eq(agentkitUsage.humanId, humanId), eq(agentkitUsage.endpoint, endpoint)))
      return true
    }

    return false // exceeded free trial — Arc Nanopayment required
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
  paymentService: PaymentService
  identityVerification?: { verifyAgentIdentity: (params: { erc8004AgentId: string; agentAddress: string }) => Promise<boolean> }
  payTo: string
}) {
  const { db, eventService, chatService, authService, paymentService, identityVerification, payTo } = props

  // --- AgentKit setup ---
  const storage = new DrizzleAgentKitStorage(db)

  // Dual-mode hook: verifies SIWE signature for identity.
  // POST (writes) = always free. GET (reads) = 3 free/hour, then Arc Nanopayment.
  const dualModeRequestHook = async (context: {
    adapter: { getHeader(name: string): string | undefined; getUrl(): string }
    path: string
    method?: string
  }): Promise<void | { grantAccess: true }> => {
    const header = context.adapter.getHeader("agentkit")
    if (!header) return

    try {
      const payload = parseAgentkitHeader(header)
      const resourceUri = context.adapter.getUrl()
      const checkNonce = async (nonce: string) => !(await storage.hasUsedNonce(nonce))
      const validation = await validateAgentkitMessage(payload, resourceUri, { checkNonce })
      if (!validation.valid) return

      const verification = await verifyAgentkitSignature(payload)
      if (!verification.valid) return

      await storage.recordNonce(payload.nonce)

      // Determine if this is a write (POST) or read (GET)
      // context.method is set by the Hono x402 middleware (c.req.method)
      const method = context.method ?? "GET"

      // POST = always free (writes are free, we want agents to contribute)
      if (method === "POST") {
        return { grantAccess: true }
      }

      // GET = 3 free per hour, then Arc Nanopayment required
      // Rate-limit by userId (sybil-resistant) with address fallback
      const result = await authService.getUserByAgentAddress({ address: payload.address })
      const rateLimitKey = result?.userId ?? payload.address.toLowerCase()
      const hasFreeUses = await storage.tryIncrementUsage(context.path, rateLimitKey, 3)

      if (hasFreeUses) {
        return { grantAccess: true }
      }

      // Exhausted free tier — fall through to x402 Arc Nanopayment
      return
    } catch {
      return
    }
  }

  // Circle Gateway facilitator for Arc testnet (gasless, batched settlement)
  const arcFacilitator = new BatchFacilitatorClient()

  // GatewayEvmScheme auto-registers money parsers for all Gateway-supported chains
  const gatewayScheme = new GatewayEvmScheme()

  const agentExt = declareAgentkitExtension({
    statement: "Access Ground Truth API as a verified human-backed agent",
    mode: { type: "free-trial", uses: 3 },
  })

  // Reads: $0.005 on Arc testnet (after 3 free/hour)
  const readAccepts = [
    { scheme: "exact" as const, price: "$0.005", network: ARC_TESTNET, payTo },
  ]
  // Writes: $0.01 on Arc testnet (but always free via hook — accepts needed for 402 challenge)
  const writeAccepts = [
    { scheme: "exact" as const, price: "$0.01", network: ARC_TESTNET, payTo },
  ]

  const routes = {
    "GET /api/agent/events": { accepts: readAccepts, extensions: agentExt },
    "GET /api/agent/events/:id": { accepts: readAccepts, extensions: agentExt },
    "POST /api/agent/events": { accepts: writeAccepts, extensions: agentExt },
    "GET /api/agent/chat": { accepts: readAccepts, extensions: agentExt },
    "POST /api/agent/chat": { accepts: writeAccepts, extensions: agentExt },
    "POST /api/agent/upload": { accepts: writeAccepts, extensions: agentExt },
  } satisfies RoutesConfig

  // Cast: BatchFacilitatorClient's PaymentPayload types are slightly narrower than @x402/core's
  // (description: string vs string | undefined) — structurally compatible at runtime
  const resourceServer = new x402ResourceServer(
    arcFacilitator as unknown as import("@x402/core/server").FacilitatorClient
  )
    .register(ARC_TESTNET, gatewayScheme)
    .registerExtension(agentkitResourceServerExtension)

  const httpServer = new x402HTTPResourceServer(
    resourceServer,
    routes
  ).onProtectedRequest(dualModeRequestHook)

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
        // Look up completed agent profile for ENS name attribution
        const profile = await authService.getAgentProfileByAddress({
          address: payload.address,
        })
        c.set("agentEnsName", profile?.registrationStep === 4 ? profile.ensName : null)
        c.set("erc8004AgentId", profile?.erc8004AgentId ?? null)

        // On-chain ERC-8004 identity verification
        if (profile?.erc8004AgentId && identityVerification) {
          const verified = await identityVerification.verifyAgentIdentity({
            erc8004AgentId: profile.erc8004AgentId,
            agentAddress: payload.address,
          })
          c.set("onChainVerified", verified)
        }
      }
    } catch (err) {
      const log = c.get("log")
      log?.set({ agentResolveError: String(err) })
    }
    await next()
  })

  // --- Routes ---

  // Public stats endpoint (no auth, no payment)
  app.get("/stats", async (c) => {
    const stats = await paymentService.getStats()
    return c.json(stats)
  })

  app.get("/identity", async (c) => {
    const agentAddress = c.get("agentAddress")
    if (!agentAddress) return c.json({ error: "No agent address" }, 401)

    const profile = await authService.getAgentProfileByAddress({ address: agentAddress })
    if (!profile) return c.json({ agentId: null, ensName: null, registrationStep: 0 })

    return c.json({
      agentId: profile.erc8004AgentId ?? null,
      ensName: profile.ensName,
      registrationStep: profile.registrationStep,
    })
  })

  app.post("/wallet-signature", async (c) => {
    const agentAddress = c.get("agentAddress")
    if (!agentAddress) return c.json({ error: "No agent address" }, 401)

    const profile = await authService.getAgentProfileByAddress({ address: agentAddress })
    if (!profile || profile.registrationStep < 4 || !profile.erc8004AgentId) {
      return c.json({ error: "Agent registration not complete" }, 400)
    }

    const { signature, deadline } = (await c.req.json()) as { signature: string; deadline: string }
    if (!signature || !deadline) {
      return c.json({ error: "signature and deadline required" }, 400)
    }

    await authService.storeWalletLinkSignature({
      profileId: profile.id,
      signature,
      deadline,
    })

    return c.json({ ok: true })
  })

  app.get("/events", async (c) => {
    const log = c.get("log")
    log?.set({ route: "agent.events.list" })

    const query = c.req.query()
    const category = query.category
      ? query.category.includes(",")
        ? query.category.split(",").map(c => eventCategorySchema.parse(c.trim()))
        : eventCategorySchema.parse(query.category)
      : undefined
    const severity = query.severity
      ? severityLevelSchema.parse(query.severity)
      : undefined
    const limit = query.limit ? Number(query.limit) : undefined
    const cursor = query.cursor ? WorldEventId.parse(query.cursor) : undefined
    const result = await eventService.getAll({
      category,
      severity,
      search: query.search,
      limit,
      cursor,
    })

    // Record if this was a paid read (payment-signature header = x402 payment happened)
    const agentAddress = c.get("agentAddress")
    const wasPaid = c.req.header("payment-signature") || c.req.header("x-payment")
    if (agentAddress && wasPaid) {
      paymentService.recordPayment({
        payerAddress: agentAddress,
        route: "GET /api/agent/events",
        amountUsd: "0.005",
        network: ARC_TESTNET,
        category: Array.isArray(category) ? category[0] : category ?? null,
      }).catch((err) => {
        log?.error(err instanceof Error ? err : new Error(String(err)))
      })
    }

    return c.json(result)
  })

  app.get("/events/:id", async (c) => {
    const log = c.get("log")
    log?.set({ route: "agent.events.getById" })

    const id = WorldEventId.parse(c.req.param("id"))
    const event = await eventService.getById({ id })
    if (!event) return c.json({ error: "Event not found" }, 404)

    // Record paid reads only
    const agentAddress = c.get("agentAddress")
    const wasPaid = c.req.header("payment-signature") || c.req.header("x-payment")
    if (agentAddress && wasPaid) {
      paymentService.recordPayment({
        payerAddress: agentAddress,
        route: "GET /api/agent/events/:id",
        amountUsd: "0.005",
        network: ARC_TESTNET,
      }).catch((err) => {
        log?.error(err instanceof Error ? err : new Error(String(err)))
      })
    }

    return c.json(event)
  })

  app.post("/events", async (c) => {
    const log = c.get("log")
    log?.set({ route: "agent.events.create" })

    const userId = c.get("userId")
    if (!userId) return c.json({ error: "Agent not linked to a user" }, 403)

    const rawBody = await c.req.json()
    const body = createEventInputSchema.parse(rawBody)
    const corroboratesEventId = rawBody.corroboratesEventId
      ? WorldEventId.parse(rawBody.corroboratesEventId)
      : null
    const agentAddress = c.get("agentAddress") ?? null
    const agentEnsName = c.get("agentEnsName") ?? null
    const erc8004AgentId = c.get("erc8004AgentId") ?? null
    const onChainVerified = c.get("onChainVerified") ?? false
    const event = await eventService.create({ ...body, userId, agentAddress, agentEnsName, erc8004AgentId, onChainVerified, corroboratesEventId })
    return c.json(event, 201)
  })

  app.get("/chat", async (c) => {
    const log = c.get("log")
    log?.set({ route: "agent.chat.list" })

    const query = c.req.query()
    const eventId = query.eventId
      ? WorldEventId.parse(query.eventId)
      : undefined
    const countryIso3Raw = query.countryIso3
    const countryIso3 =
      countryIso3Raw && /^[A-Z]{3}$/.test(countryIso3Raw)
        ? countryIso3Raw
        : null
    if (eventId && countryIso3) {
      return c.json(
        { error: "eventId and countryIso3 are mutually exclusive" },
        400
      )
    }
    const limit = query.limit ? Number(query.limit) : undefined
    const messages = await chatService.getMessages({
      eventId: eventId ?? null,
      countryIso3,
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
    const agentAddress = c.get("agentAddress") ?? null
    const agentEnsName = c.get("agentEnsName") ?? null
    const body = createChatMessageInputSchema.parse(await c.req.json())
    const message = await chatService.create({
      eventId: body.eventId ?? null,
      countryIso3: body.countryIso3 ?? null,
      content: body.content,
      authorName: userName,
      userId,
      agentAddress,
      agentEnsName,
    })
    return c.json(message, 201)
  })

  app.post("/upload", async (c) => {
    const log = c.get("log")
    log?.set({ route: "agent.upload" })

    const userId = c.get("userId")
    if (!userId) return c.json({ error: "Agent not linked to a user" }, 403)

    const { url } = (await c.req.json()) as { url: string }
    if (!url || typeof url !== "string") {
      return c.json({ error: "url is required" }, 400)
    }

    const imgRes = await fetch(url)
    if (!imgRes.ok) {
      return c.json({ error: `Failed to fetch image: ${imgRes.status}` }, 400)
    }

    const contentType = imgRes.headers.get("content-type")?.split(";")[0]
    if (!contentType || !UPLOAD_ALLOWED_TYPES.includes(contentType as typeof UPLOAD_ALLOWED_TYPES[number])) {
      return c.json({ error: `Unsupported image type: ${contentType}` }, 400)
    }

    const blob = await imgRes.blob()
    if (blob.size > UPLOAD_MAX_SIZE_BYTES) {
      return c.json({ error: `Image too large: ${blob.size} bytes (max ${UPLOAD_MAX_SIZE_BYTES})` }, 400)
    }

    const ext = contentType.split("/")[1] ?? "jpg"
    const filename = `agent-${Date.now()}.${ext}`
    const result = await put(filename, blob, { access: "public" })

    return c.json({ url: result.url }, 201)
  })

  return app
}
