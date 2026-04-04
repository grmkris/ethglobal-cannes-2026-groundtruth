/**
 * Agent Demo — demonstrates consuming AgentKit-protected Ground Truth API.
 *
 * Prerequisites:
 *   1. Register agent wallet: npx @worldcoin/agentkit-cli register <address>
 *   2. Start server: bun run dev
 *
 * Usage:
 *   AGENT_PRIVATE_KEY=0x... bun run scripts/agent-demo.ts
 */

import { privateKeyToAccount } from "viem/accounts"
import { getAddress } from "viem"
import { SiweMessage } from "siwe"

const API_BASE = process.env.API_URL ?? "http://localhost:3000/api/agent"
const account = privateKeyToAccount(
  process.env.AGENT_PRIVATE_KEY as `0x${string}`
)

// --- AgentKit 402 → sign → retry flow (per SKILL.md) ---

async function agentFetch(url: string, init?: RequestInit): Promise<Response> {
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
  const chain = supportedChains.find((c: { chainId: string }) =>
    c.chainId.startsWith("eip155:")
  )
  if (!chain) throw new Error("No supported EVM chain in challenge")

  // Extract numeric chain ID from CAIP-2 (eip155:480 → 480)
  const numericChainId = Number(chain.chainId.split(":")[1])
  const address = getAddress(account.address)

  // Construct SIWE message using same library as server (exact format match)
  const siweMessage = new SiweMessage({
    domain: info.domain,
    address,
    statement: info.statement,
    uri: info.uri,
    version: info.version,
    chainId: numericChainId,
    nonce: info.nonce,
    issuedAt: info.issuedAt,
    expirationTime: info.expirationTime,
    notBefore: info.notBefore,
    requestId: info.requestId,
    resources: info.resources,
  })
  const message = siweMessage.prepareMessage()

  // Sign with agent wallet
  const signature = await account.signMessage({ message })

  // Build agentkit header
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
  return fetch(url, {
    ...init,
    headers: { ...Object.fromEntries(new Headers(init?.headers).entries()), agentkit: header },
  })
}

// --- Demo ---

async function main() {
  console.log(`Agent: ${account.address}`)
  console.log(`API:   ${API_BASE}\n`)

  // 1. List events
  console.log("→ GET /events")
  const eventsRes = await agentFetch(`${API_BASE}/events`)
  const events = await eventsRes.json()
  console.log(`  ${eventsRes.status} — ${Array.isArray(events) ? events.length : 0} events\n`)

  // 2. Create event
  console.log("→ POST /events")
  const createRes = await agentFetch(`${API_BASE}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Agent Test Report",
      description: "Automated intelligence submitted by a verified agent",
      category: "technology",
      severity: "low",
      latitude: 43.5528,
      longitude: 7.0174,
      location: "Cannes, France",
    }),
  })
  const created = await createRes.json()
  console.log(`  ${createRes.status} — ${created.id ?? created.error ?? "unknown"}\n`)

  // 3. Send chat message
  console.log("→ POST /chat")
  const chatRes = await agentFetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: "Hello from a verified agent!",
    }),
  })
  const chat = await chatRes.json()
  console.log(`  ${chatRes.status} — ${chat.id ?? chat.error ?? "unknown"}\n`)

  console.log("Done.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
