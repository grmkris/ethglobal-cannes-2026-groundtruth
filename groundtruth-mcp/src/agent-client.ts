import { privateKeyToAccount } from "viem/accounts"
import { getAddress } from "viem"

/**
 * HTTP client for the /api/agent/* endpoints.
 * Handles the x402 + AgentKit challenge-response flow automatically:
 *   1. Send request (no auth)
 *   2. If 402 → parse challenge from `payment-required` header
 *   3. Sign SIWE message with agent wallet
 *   4. Retry with signed `agentkit` header
 */
export function createAgentClient(props: {
  privateKey: `0x${string}`
  apiUrl: string
}) {
  const account = privateKeyToAccount(props.privateKey)
  const baseUrl = props.apiUrl.replace(/\/$/, "")
  const address = getAddress(account.address)

  /**
   * Fetch with automatic 402 challenge-response handling.
   * Mirrors the flow from scripts/agent-demo.ts.
   */
  async function agentFetch(
    url: string,
    init?: RequestInit
  ): Promise<Response> {
    const res = await fetch(url, init)

    if (res.status !== 402) return res

    // Parse 402 challenge from payment-required header (base64-encoded JSON)
    const prHeader = res.headers.get("payment-required")
    if (!prHeader) throw new Error("402 without payment-required header")

    const challenge = JSON.parse(atob(prHeader))
    const agentkit = challenge?.extensions?.agentkit

    if (!agentkit) {
      throw new Error("402 without agentkit extension — payment required")
    }

    const { info, supportedChains } = agentkit

    // Pick first EVM chain
    const chain = supportedChains?.find((c: { chainId: string }) =>
      c.chainId.startsWith("eip155:")
    )
    if (!chain) throw new Error("No supported EVM chain in 402 challenge")

    const numericChainId = chain.chainId.split(":")[1]

    // Construct SIWE message from server-provided challenge
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
    if (info.expirationTime)
      lines.push(`Expiration Time: ${info.expirationTime}`)
    if (info.notBefore) lines.push(`Not Before: ${info.notBefore}`)
    if (info.requestId) lines.push(`Request ID: ${info.requestId}`)
    if (info.resources?.length) {
      lines.push("Resources:")
      for (const r of info.resources) lines.push(`- ${r}`)
    }

    const message = lines.join("\n")
    const signature = await account.signMessage({ message })

    // Build agentkit header from challenge + signature
    const header = btoa(
      JSON.stringify({
        ...info,
        address,
        chainId: chain.chainId,
        type: chain.type,
        signature,
      })
    )

    // Retry with signed header
    const retryHeaders = new Headers(init?.headers)
    retryHeaders.set("agentkit", header)

    return fetch(url, {
      ...init,
      headers: Object.fromEntries(retryHeaders.entries()),
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

    getEvents(params?: {
      category?: string
      severity?: string
      search?: string
    }) {
      const qs = new URLSearchParams()
      if (params?.category) qs.set("category", params.category)
      if (params?.severity) qs.set("severity", params.severity)
      if (params?.search) qs.set("search", params.search)
      const query = qs.toString()
      return request<unknown[]>("GET", `/events${query ? `?${query}` : ""}`)
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
  }
}

export type AgentClient = ReturnType<typeof createAgentClient>
