import { NextResponse } from "next/server"
import { createDb } from "@/server/db/db"
import { env } from "@/env"
import { AgentProfileId } from "@/lib/typeid"
import { ERC8004_IDENTITY_REGISTRY } from "@/lib/contracts"

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

  const card = {
    type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
    name: profile.label,
    description: profile.mandate,
    active: true,
    registrations: profile.erc8004AgentId
      ? [
          {
            agentId: Number(profile.erc8004AgentId),
            agentRegistry: ERC8004_IDENTITY_REGISTRY,
          },
        ]
      : [],
    services: [
      {
        type: "ENS",
        url: profile.ensName,
        description: "ENS subdomain identity",
      },
      {
        type: "MCP",
        url: `${env.APP_URL}/api/agent`,
        description: "Ground Truth intelligence API",
      },
      {
        type: "A2A",
        url: profile.agentWallet?.address ?? "",
        description: "Agent-to-agent wallet",
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
