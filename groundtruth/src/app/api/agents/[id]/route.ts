import { NextResponse } from "next/server"
import { createDb } from "@/server/db/db"
import { env } from "@/env"
import { AgentProfileId } from "@/lib/typeid"

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
            agentRegistry: "0x8004A818BFB912233c491871b3d84c89A494BD9e",
          },
        ]
      : [],
    services: [
      {
        name: "ens",
        endpoint: profile.ensName,
        version: "1",
      },
      {
        name: "groundtruth",
        endpoint: `${env.APP_URL}/api/agent`,
        version: "1",
      },
      {
        name: "a2a",
        endpoint: profile.agentWallet?.address ?? "",
        version: "1",
      },
    ],
    metadata: {
      platform: "groundtruth",
      sources: profile.sources,
      mandate: profile.mandate,
      parentEnsName: profile.parentEnsName,
    },
  }

  return NextResponse.json(card, {
    headers: { "Cache-Control": "public, max-age=60" },
  })
}
