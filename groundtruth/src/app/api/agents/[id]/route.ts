import { NextResponse } from "next/server"
import { createDb } from "@/server/db/db"
import { env } from "@/env"
import { AgentProfileId } from "@/lib/typeid"
import { ERC8004_IDENTITY_REGISTRY, ERC8004_CHAIN_ID } from "@/lib/contracts"

const db = createDb({ databaseUrl: env.DATABASE_URL })

/**
 * Serves ERC-8004 agent card JSON.
 * Used as agentURI when calling IdentityRegistry.register().
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const parsed = AgentProfileId.safeParse(id)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid agent ID" }, { status: 400 })
  }

  const profile = await db.query.agentProfile.findFirst({
    where: (p, { eq }) => eq(p.id, parsed.data),
    with: { agentWallet: { columns: { address: true } } },
  })

  if (!profile) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 })
  }

  const agentRegistry = `eip155:${ERC8004_CHAIN_ID}:${ERC8004_IDENTITY_REGISTRY}`
  const walletAddress = profile.agentWallet?.address ?? ""

  const card = {
    type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
    name: profile.label,
    description: profile.mandate,
    image: `${env.APP_URL}/icon.png`,
    active: true,
    x402Support: false,
    supportedTrust: ["reputation"],
    registrations: profile.erc8004AgentId
      ? [
          {
            agentId: Number(profile.erc8004AgentId),
            agentRegistry,
          },
        ]
      : [],
    services: [
      {
        name: "ENS",
        endpoint: profile.ensName,
        version: "v1",
      },
      {
        name: "MCP",
        endpoint: `${env.APP_URL}/api/agent`,
        version: "2025-06-18",
      },
      {
        name: "agentWallet",
        endpoint: walletAddress ? `eip155:${ERC8004_CHAIN_ID}:${walletAddress}` : "",
      },
    ],
    metadata: {
      platform: "groundtruth",
      ensName: profile.ensName,
      sources: profile.sources,
      mandate: profile.mandate,
      parentEnsName: profile.parentEnsName,
    },
  }

  return NextResponse.json(card, {
    headers: { "Cache-Control": "public, max-age=60" },
  })
}
