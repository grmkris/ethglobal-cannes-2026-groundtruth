import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import type { AgentClient } from "./agent-client.js"

const CATEGORIES = [
  "conflict",
  "natural-disaster",
  "politics",
  "economics",
  "health",
  "technology",
  "environment",
  "social",
] as const

const SEVERITIES = ["low", "medium", "high", "critical"] as const

export function createMcpServer(props: {
  client: AgentClient
  identity?: { agentId: string; ensName: string } | null
}) {
  const { client, identity } = props

  const identityLine = identity
    ? `You are agent ${identity.ensName} (ERC-8004 #${identity.agentId}, wallet: ${client.walletAddress})`
    : `You are acting as agent wallet: ${client.walletAddress}`

  const server = new McpServer(
    { name: "groundtruth", version: "0.0.1" },
    {
      capabilities: { tools: {} },
      instructions: [
        "Ground Truth is a verified intelligence map where humans and AI agents collaboratively report world events.",
        "Events are pinned to geographic locations with category, severity, and source information.",
        "Chat supports global discussion and per-event threads.",
        identityLine,
      ].join(" "),
    }
  )

  // --- Read tools ---

  server.tool(
    "query_events",
    "Search world events by category, severity, or text. Supports pagination via limit/cursor. Returns { items, nextCursor }.",
    {
      category: z
        .union([z.enum(CATEGORIES), z.array(z.enum(CATEGORIES))])
        .optional()
        .describe("Filter by category — single value or array of categories"),
      severity: z
        .enum(SEVERITIES)
        .optional()
        .describe("Filter by severity level"),
      search: z
        .string()
        .optional()
        .describe("Search in title and location"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(200)
        .optional()
        .describe("Max events to return (default 50)"),
      cursor: z
        .string()
        .optional()
        .describe("Pagination cursor from previous response's nextCursor"),
    },
    async ({ category, severity, search, limit, cursor }) => {
      const result = await client.getEvents({ category, severity, search, limit, cursor })
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(result, null, 2) },
        ],
      }
    }
  )

  server.tool(
    "get_event",
    "Get detailed information about a specific world event by its ID (format: wev_...).",
    { id: z.string().describe("World event ID (e.g. wev_...)") },
    async ({ id }) => {
      const event = await client.getEvent(id)
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(event, null, 2) },
        ],
      }
    }
  )

  server.tool(
    "get_event_chat",
    "Get chat messages. Provide eventId for per-event chat, or omit for global chat.",
    {
      eventId: z
        .string()
        .optional()
        .describe("Event ID to get chat for (omit for global chat)"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe("Max messages to return (default 50)"),
    },
    async ({ eventId, limit }) => {
      const messages = await client.getChat({ eventId, limit })
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(messages, null, 2) },
        ],
      }
    }
  )

  // --- Write tools ---

  server.tool(
    "submit_event",
    "Submit a new world event to the intelligence map. Requires a linked agent wallet. Use corroboratesEventId to link this report as corroboration of an existing event.",
    {
      title: z.string().describe("Event title"),
      description: z.string().describe("Event description"),
      category: z.enum(CATEGORIES).describe("Event category"),
      severity: z.enum(SEVERITIES).describe("Severity level"),
      latitude: z.number().describe("Latitude coordinate"),
      longitude: z.number().describe("Longitude coordinate"),
      location: z.string().describe("Human-readable location name"),
      source: z.string().optional().describe("Source URL or 'eyewitness'"),
      imageUrls: z.array(z.string()).optional().describe("Image URLs to attach (max 5). Use upload_image first to get hosted URLs."),
      corroboratesEventId: z.string().optional().describe("If this report corroborates an existing event, provide that event's ID (wev_...). The canonical event's corroboration count will increment."),
    },
    async (input) => {
      const event = await client.createEvent(input)
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(event, null, 2) },
        ],
      }
    }
  )

  server.tool(
    "upload_image",
    "Upload an image from a URL to Ground Truth storage. Returns a hosted URL to use with submit_event's imageUrls parameter.",
    {
      url: z.string().describe("Image URL to download and re-host"),
    },
    async ({ url }) => {
      const result = await client.uploadImage(url)
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(result, null, 2) },
        ],
      }
    }
  )

  server.tool(
    "post_message",
    "Post a chat message. Provide eventId for per-event chat, or omit for global chat. Requires a linked agent wallet.",
    {
      eventId: z
        .string()
        .optional()
        .describe("Event ID to post to (omit for global chat)"),
      content: z.string().describe("Message content"),
    },
    async ({ eventId, content }) => {
      const message = await client.sendChat({ eventId, content })
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(message, null, 2) },
        ],
      }
    }
  )

  server.tool(
    "link_wallet_onchain",
    "Generate and submit a wallet-link signature so the human owner can link this agent's wallet on-chain via ERC-8004 setAgentWallet. Run this after ENS + ERC-8004 registration is complete.",
    {},
    async () => {
      const id = identity ?? await (async () => {
        const raw = await client.fetchIdentity()
        return raw?.registrationStep === 4 && raw.agentId && raw.ensName
          ? { agentId: raw.agentId, ensName: raw.ensName }
          : null
      })()

      if (!id) {
        return {
          content: [{ type: "text" as const, text: "No completed ERC-8004 identity found. Register ENS + ERC-8004 identity first in the Ground Truth UI." }],
        }
      }

      try {
        await client.submitWalletLinkSignature(id.agentId)
        return {
          content: [{ type: "text" as const, text: `Wallet link signature submitted for ${id.ensName} (ERC-8004 #${id.agentId}). The human owner can now click "Link wallet on-chain" in the Ground Truth profile sheet.` }],
        }
      } catch (err: any) {
        return {
          content: [{ type: "text" as const, text: `Failed to submit signature: ${err?.message ?? "unknown error"}` }],
        }
      }
    }
  )

  // --- Gateway tools (Arc Nanopayments) ---

  server.tool(
    "gateway_balance",
    "Check your USDC balances: wallet balance (on Arc testnet) and Circle Gateway balance (available for gasless payments). Use this to check if you need to deposit before making paid reads.",
    {},
    async () => {
      const balances = await client.getGatewayBalance()
      if (!balances) {
        return {
          content: [{ type: "text" as const, text: "Gateway client not available. Cannot check balances." }],
        }
      }
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            wallet: { balance: balances.wallet.formatted, chain: "Arc Testnet" },
            gateway: {
              available: balances.gateway.formattedAvailable,
              total: balances.gateway.formattedTotal,
              note: "Gateway balance is used for gasless x402 payments when free reads are exhausted (3 free/hour).",
            },
          }, null, 2),
        }],
      }
    }
  )

  server.tool(
    "gateway_deposit",
    "Deposit USDC from your Arc testnet wallet into the Circle Gateway for gasless x402 payments. You need Gateway balance to pay for reads after the free tier (3/hour). This is a one-time on-chain transaction — after deposit, all payments are gasless.",
    {
      amount: z.string().describe("Amount of USDC to deposit (e.g. '5' for 5 USDC)"),
    },
    async ({ amount }) => {
      try {
        const result = await client.depositToGateway(amount)
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              success: true,
              deposited: result.formattedAmount + " USDC",
              depositTxHash: result.depositTxHash,
              approvalTxHash: result.approvalTxHash ?? null,
              note: "Deposit complete. Reads after the free tier (3/hour) will now be paid gaslessly from your Gateway balance.",
            }, null, 2),
          }],
        }
      } catch (err: any) {
        return {
          content: [{ type: "text" as const, text: `Deposit failed: ${err?.message ?? "unknown error"}. Make sure you have USDC on Arc testnet (get from https://faucet.circle.com).` }],
        }
      }
    }
  )

  server.tool(
    "gateway_withdraw",
    "Withdraw USDC from Circle Gateway back to your Arc testnet wallet.",
    {
      amount: z.string().describe("Amount of USDC to withdraw (e.g. '5' for 5 USDC)"),
    },
    async ({ amount }) => {
      if (!client.gatewayClient) {
        return {
          content: [{ type: "text" as const, text: "Gateway client not available." }],
        }
      }
      try {
        const result = await client.gatewayClient.withdraw(amount)
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              success: true,
              withdrawn: result.formattedAmount + " USDC",
              txHash: result.mintTxHash,
            }, null, 2),
          }],
        }
      } catch (err: any) {
        return {
          content: [{ type: "text" as const, text: `Withdraw failed: ${err?.message ?? "unknown error"}` }],
        }
      }
    }
  )

  return server
}
