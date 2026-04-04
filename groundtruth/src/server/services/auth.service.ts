import { eq } from "drizzle-orm"
import { log } from "@/lib/evlog"
import type { Database } from "../db/db"
import { user, walletAddress, worldIdVerification, agentWallet, agentProfile } from "../db/schema/schema"
import type { UserId, AgentProfileId, AgentWalletId } from "@/lib/typeid"

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

  async function getUserByAddress(params: {
    address: string
  }): Promise<{ userId: UserId; userName: string } | null> {
    const addr = params.address.toLowerCase()
    const wa = await db.query.walletAddress.findFirst({
      where: (w, { eq }) => eq(w.address, addr),
      columns: { userId: true },
    })
    if (!wa) return null

    const u = await db.query.user.findFirst({
      where: (u, { eq }) => eq(u.id, wa.userId),
      columns: { name: true },
    })
    return { userId: wa.userId, userName: u?.name ?? "Unknown" }
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

  async function createAgentProfile(params: {
    userId: UserId
    agentWalletId: AgentWalletId
    label: string
    parentEnsName: string
    mandate: string
    sources: string
  }) {
    const ensName = `${params.label}.${params.parentEnsName}`.toLowerCase()

    const existing = await db.query.agentProfile.findFirst({
      where: (p, { eq }) => eq(p.ensName, ensName),
      columns: { id: true },
    })
    if (existing) throw new Error(`ENS name "${ensName}" is already registered`)

    log.info({ msg: "Creating agent profile", ensName, service: "auth" })

    const [profile] = await db
      .insert(agentProfile)
      .values({
        userId: params.userId,
        agentWalletId: params.agentWalletId,
        ensName,
        label: params.label,
        parentEnsName: params.parentEnsName,
        mandate: params.mandate,
        sources: params.sources,
        registrationStep: 0,
      })
      .returning()

    return profile!
  }

  async function updateRegistrationStep(params: {
    profileId: AgentProfileId
    step: number
    erc8004AgentId?: string
  }) {
    await db
      .update(agentProfile)
      .set({
        registrationStep: params.step,
        ...(params.erc8004AgentId ? { erc8004AgentId: params.erc8004AgentId } : {}),
      })
      .where(eq(agentProfile.id, params.profileId))
  }

  async function getAgentProfileById(params: { profileId: AgentProfileId }) {
    return db.query.agentProfile.findFirst({
      where: (p, { eq }) => eq(p.id, params.profileId),
      columns: { id: true, userId: true, registrationStep: true },
    })
  }

  async function deleteAgentProfile(params: { profileId: AgentProfileId }) {
    await db.delete(agentProfile).where(eq(agentProfile.id, params.profileId))
  }

  async function getAgentProfiles(params: { userId: UserId }) {
    return db.query.agentProfile.findMany({
      where: (p, { eq }) => eq(p.userId, params.userId),
      with: { agentWallet: { columns: { address: true } } },
    })
  }

  async function resolveAgentByEnsName(params: { ensName: string }) {
    return db.query.agentProfile.findFirst({
      where: (p, { eq }) => eq(p.ensName, params.ensName.toLowerCase()),
      with: { agentWallet: { columns: { address: true } } },
    })
  }

  async function getAgentProfileByAddress(params: { address: string }) {
    const wallet = await db.query.agentWallet.findFirst({
      where: (a, { eq }) => eq(a.address, params.address.toLowerCase()),
      columns: { id: true },
    })
    if (!wallet) return null
    return db.query.agentProfile.findFirst({
      where: (p, { eq }) => eq(p.agentWalletId, wallet.id),
    })
  }

  return {
    verifyWorldId,
    isWorldIdVerified,
    linkAgentWallet,
    getUserByAgentAddress,
    getAgentWallets,
    createAgentProfile,
    updateRegistrationStep,
    getAgentProfiles,
    resolveAgentByEnsName,
    getAgentProfileById,
    getUserByAddress,
    getAgentProfileByAddress,
    deleteAgentProfile,
  }
}

export type AuthService = ReturnType<typeof createAuthService>
