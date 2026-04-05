import { privateKeyToAccount } from "viem/accounts"
import { getAddress } from "viem"
import { GatewayClient } from "@circle-fin/x402-batching/client"

const ERC8004_IDENTITY_REGISTRY = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" as const

/**
 * HTTP client for the /api/agent/* endpoints.
 * Dual-mode x402 flow:
 *   - Writes (POST): always free — just AgentKit SIWE for identity
 *   - Reads (GET): 3 free/hour, then Arc Nanopayment via Circle Gateway
 *
 * Flow:
 *   1. Send request → 402 with agentkit challenge
 *   2. Sign SIWE → retry with `agentkit` header
 *   3. If free tier OK → done
 *   4. If 402 again → GatewayClient pays via Arc Nanopayment
 */
export function createAgentClient(props: {
  privateKey: `0x${string}`
  apiUrl: string
}) {
  const account = privateKeyToAccount(props.privateKey)
  const baseUrl = props.apiUrl.replace(/\/$/, "")
  const address = getAddress(account.address)

  // Circle Gateway client for paid reads (Arc testnet, gasless batched settlement)
  let gateway: GatewayClient | null = null
  try {
    gateway = new GatewayClient({
      chain: "arcTestnet",
      privateKey: props.privateKey,
    })
  } catch {
    // Gateway not available — reads limited to free tier
  }

  /** Sign AgentKit SIWE challenge from a 402 response */
  async function signAgentkitChallenge(res: Response): Promise<string | null> {
    const prHeader = res.headers.get("payment-required")
    if (!prHeader) return null

    const challenge = JSON.parse(atob(prHeader))
    const agentkit = challenge?.extensions?.agentkit
    if (!agentkit) return null

    const { info, supportedChains } = agentkit
    const chain = supportedChains?.find((c: { chainId: string }) =>
      c.chainId.startsWith("eip155:")
    )
    if (!chain) return null

    const numericChainId = chain.chainId.split(":")[1]
    const lines = [
      `${info.domain} wants you to sign in with your Ethereum account:`,
      address,
      "",
      info.statement ?? "",
      "",
      `URI: ${info.uri}`,
      `Version: ${info.version}`,
      `Chain ID: ${numericChainId}`,
      `Nonce: ${info.nonce}`,
      `Issued At: ${info.issuedAt}`,
    ]
    if (info.expirationTime) lines.push(`Expiration Time: ${info.expirationTime}`)
    if (info.notBefore) lines.push(`Not Before: ${info.notBefore}`)
    if (info.requestId) lines.push(`Request ID: ${info.requestId}`)
    if (info.resources?.length) {
      lines.push("Resources:")
      for (const r of info.resources) lines.push(`- ${r}`)
    }

    const message = lines.join("\n")
    const signature = await account.signMessage({ message })

    return btoa(JSON.stringify({
      ...info,
      address,
      chainId: chain.chainId,
      type: chain.type,
      signature,
    }))
  }

  /**
   * Fetch with dual-mode 402 handling:
   * 1. First 402: sign SIWE for identity → retry
   * 2. Second 402 (free tier exhausted): pay via Arc Gateway → retry
   */
  async function agentFetch(
    url: string,
    init?: RequestInit
  ): Promise<Response> {
    const res = await fetch(url, init)
    if (res.status !== 402) return res

    // First 402: sign AgentKit SIWE
    const agentkitHeader = await signAgentkitChallenge(res)
    if (!agentkitHeader) throw new Error("402 without agentkit extension")

    const retryHeaders = new Headers(init?.headers)
    retryHeaders.set("agentkit", agentkitHeader)

    const res2 = await fetch(url, {
      ...init,
      headers: Object.fromEntries(retryHeaders.entries()),
    })

    // Free tier accepted — done
    if (res2.status !== 402) return res2

    // Second 402: free tier exhausted — need Arc Nanopayment
    if (!gateway) {
      throw new Error("Free tier exhausted and no Gateway client configured for Arc payments")
    }

    // Use GatewayClient to handle payment — it sends its own 402 flow
    // Pass agentkit header so the server can still identify the agent
    const payResult = await gateway.pay(url, {
      method: (init?.method as "GET" | "POST") ?? "GET",
      body: init?.body ? JSON.parse(init.body as string) : undefined,
      headers: {
        agentkit: agentkitHeader,
        ...(init?.headers && typeof init.headers === "object" && !("entries" in init.headers)
          ? (init.headers as Record<string, string>)
          : {}),
      },
    })

    // Convert PayResult to Response for the request() function
    return new Response(JSON.stringify(payResult.data), {
      status: payResult.status,
      headers: { "content-type": "application/json" },
    })
  }

  async function request<T>(
    method: "GET" | "POST",
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${baseUrl}/api/agent${path}`

    const res = await agentFetch(url, {
      method,
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new Error(`${method} ${path} failed (${res.status}): ${text}`)
    }

    return res.json() as Promise<T>
  }

  return {
    walletAddress: address,
    gatewayClient: gateway,

    /** Deposit USDC into Circle Gateway for gasless payments (one-time setup) */
    async depositToGateway(amount: string) {
      if (!gateway) throw new Error("Gateway client not configured")
      return gateway.deposit(amount)
    },

    /** Check Gateway balance */
    async getGatewayBalance() {
      if (!gateway) return null
      return gateway.getBalances()
    },

    getEvents(params?: {
      category?: string | string[]
      severity?: string
      search?: string
      limit?: number
      cursor?: string
    }) {
      const qs = new URLSearchParams()
      if (params?.category) {
        qs.set("category", Array.isArray(params.category) ? params.category.join(",") : params.category)
      }
      if (params?.severity) qs.set("severity", params.severity)
      if (params?.search) qs.set("search", params.search)
      if (params?.limit) qs.set("limit", String(params.limit))
      if (params?.cursor) qs.set("cursor", params.cursor)
      const query = qs.toString()
      return request<{ items: unknown[]; nextCursor: string | null }>("GET", `/events${query ? `?${query}` : ""}`)
    },

    getEvent(id: string) {
      return request<unknown>("GET", `/events/${id}`)
    },

    createEvent(input: {
      title: string
      description: string
      category: string
      severity: string
      latitude: number
      longitude: number
      location: string
      source?: string
      imageUrls?: string[]
      corroboratesEventId?: string
    }) {
      return request<unknown>("POST", "/events", input)
    },

    getChat(params?: { eventId?: string; limit?: number }) {
      const qs = new URLSearchParams()
      if (params?.eventId) qs.set("eventId", params.eventId)
      if (params?.limit) qs.set("limit", String(params.limit))
      const query = qs.toString()
      return request<unknown[]>("GET", `/chat${query ? `?${query}` : ""}`)
    },

    sendChat(input: { eventId?: string; content: string }) {
      return request<unknown>("POST", "/chat", input)
    },

    uploadImage(url: string) {
      return request<{ url: string }>("POST", "/upload", { url })
    },

    async fetchIdentity() {
      try {
        return await request<{
          agentId: string | null
          ensName: string | null
          registrationStep: number
        }>("GET", "/identity")
      } catch {
        return null
      }
    },

    async submitWalletLinkSignature(agentId: string) {
      const deadline = String(Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60) // 7 days

      // EIP-712 domain must match the deployed IdentityRegistry contract.
      // Verified via getVersion() on 0x8004A169... — returns "2.0.0".
      const signature = await account.signTypedData({
        domain: {
          name: "AgentIdentity",
          version: "2.0.0",
          chainId: 1,
          verifyingContract: ERC8004_IDENTITY_REGISTRY,
        },
        types: {
          SetAgentWallet: [
            { name: "agentId", type: "uint256" },
            { name: "wallet", type: "address" },
            { name: "deadline", type: "uint256" },
          ],
        },
        primaryType: "SetAgentWallet",
        message: {
          agentId: BigInt(agentId),
          wallet: address,
          deadline: BigInt(deadline),
        },
      })

      await request("POST", "/wallet-signature", { signature, deadline })
    },
  }
}

export type AgentClient = ReturnType<typeof createAgentClient>
