import { eq } from "drizzle-orm"
import { log } from "@/lib/evlog"
import type { Database } from "../db/db"
import { user, worldIdVerification, agentWallet } from "../db/schema/schema"
import type { UserId } from "@/lib/typeid"

export function createAuthService(props: { db: Database }) {
  const { db } = props

  async function verifyWorldId(params: {
    userId: UserId
    nullifierHash: string
  }) {
    const { userId, nullifierHash } = params
    log.info({ msg: "Storing World ID verification", userId, service: "auth" })

    await db.transaction(async (tx) => {
      await tx
        .insert(worldIdVerification)
        .values({ nullifierHash, userId })
        .onConflictDoNothing()

      await tx
        .update(user)
        .set({ worldIdVerified: true })
        .where(eq(user.id, userId))
    })

    log.info({ msg: "World ID verified successfully", userId, service: "auth" })
  }

  async function isWorldIdVerified(params: {
    userId: UserId
  }): Promise<boolean> {
    const result = await db.query.user.findFirst({
      where: (u, { eq }) => eq(u.id, params.userId),
      columns: { worldIdVerified: true },
    })
    return result?.worldIdVerified ?? false
  }

  async function linkAgentWallet(params: {
    userId: UserId
    address: string
  }) {
    await db
      .insert(agentWallet)
      .values({ userId: params.userId, address: params.address.toLowerCase() })
      .onConflictDoNothing()
  }

  async function getUserByAgentAddress(params: {
    address: string
  }): Promise<{ userId: UserId; userName: string } | null> {
    const addr = params.address.toLowerCase()
    const wallet = await db.query.agentWallet.findFirst({
      where: (a, { eq }) => eq(a.address, addr),
      columns: { userId: true },
    })
    if (!wallet) return null

    const u = await db.query.user.findFirst({
      where: (u, { eq }) => eq(u.id, wallet.userId),
      columns: { name: true },
    })
    return { userId: wallet.userId, userName: u?.name ?? "Agent" }
  }

  async function getAgentWallets(params: { userId: UserId }) {
    return db.query.agentWallet.findMany({
      where: (a, { eq }) => eq(a.userId, params.userId),
      columns: { id: true, address: true, createdAt: true },
    })
  }

  return {
    verifyWorldId,
    isWorldIdVerified,
    linkAgentWallet,
    getUserByAgentAddress,
    getAgentWallets,
  }
}

export type AuthService = ReturnType<typeof createAuthService>
