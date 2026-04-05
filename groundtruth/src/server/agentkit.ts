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

    if (!existing) {
      await this.db.insert(agentkitUsage).values({ humanId, endpoint, usageCount: 1 })
      return true
    }

    if (existing.usageCount < limit) {
      await this.db
        .update(agentkitUsage)
        .set({ usageCount: existing.usageCount + 1 })
        .where(and(eq(agentkitUsage.humanId, humanId), eq(agentkitUsage.endpoint, endpoint)))
      return true
    }

    return false // exceeded free trial — x402 payment required
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
  identityVerification?: { verifyAgentIdentity: (params: { erc8004AgentId: string; agentAddress: string }) => Promise<boolean> }
  payTo: string
}) {
  const { db, eventService, chatService, authService, identityVerification, payTo } = props

  // --- AgentKit setup ---
  const storage = new DrizzleAgentKitStorage(db)

  // Custom permissive hook: verifies SIWE signature but does NOT require AgentBook registration.
  // Agents without World ID / AgentBook can still authenticate — they just won't get a verification badge.
  const permissiveRequestHook = async (context: {
    adapter: { getHeader(name: string): string | undefined; getUrl(): string }
    path: string
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
      return { grantAccess: true }
    } catch {
      return
    }
  }

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
    mode: { type: "free-trial", uses: 3 },
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
    "POST /api/agent/upload": { accepts, extensions: agentExt },
  } satisfies RoutesConfig

  const resourceServer = new x402ResourceServer(facilitatorClient)
    .register(WORLD_CHAIN, evmScheme)
    .registerExtension(agentkitResourceServerExtension)

  const httpServer = new x402HTTPResourceServer(
    resourceServer,
    routes
  ).onProtectedRequest(permissiveRequestHook)

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
    const agentAddress = c.get("agentAddress") ?? null
    const agentEnsName = c.get("agentEnsName") ?? null
    const body = createChatMessageInputSchema.parse(await c.req.json())
    const message = await chatService.create({
      eventId: body.eventId ?? null,
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
