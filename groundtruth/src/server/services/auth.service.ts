import { and, eq } from "drizzle-orm"
import { getAddress } from "viem"
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
      const existing = await tx.query.worldIdVerification.findFirst({
        where: (v, { eq }) => eq(v.nullifierHash, nullifierHash),
      })
      if (existing && existing.userId !== userId) {
        throw new Error("This World ID is already linked to another account")
      }

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
      .values({ userId: params.userId, address: getAddress(params.address) })
      .onConflictDoNothing()
  }

  async function deleteAgentWallet(params: {
    walletId: AgentWalletId
    userId: UserId
  }) {
    await db
      .delete(agentWallet)
      .where(
        and(
          eq(agentWallet.id, params.walletId),
          eq(agentWallet.userId, params.userId)
        )
      )
  }

  async function getUserByAddress(params: {
    address: string
  }): Promise<{ userId: UserId; userName: string } | null> {
    const addr = getAddress(params.address)
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
    const addr = getAddress(params.address)
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
      where: (a, { eq }) => eq(a.address, getAddress(params.address)),
      columns: { id: true },
    })
    if (!wallet) return null
    return db.query.agentProfile.findFirst({
      where: (p, { eq }) => eq(p.agentWalletId, wallet.id),
    })
  }

  async function storeWalletLinkSignature(params: {
    profileId: AgentProfileId
    signature: string
    deadline: string
  }) {
    await db
      .update(agentProfile)
      .set({
        walletLinkSignature: params.signature,
        walletLinkDeadline: params.deadline,
      })
      .where(eq(agentProfile.id, params.profileId))
  }

  async function getWalletLinkSignature(params: { profileId: AgentProfileId }) {
    const profile = await db.query.agentProfile.findFirst({
      where: (p, { eq }) => eq(p.id, params.profileId),
      columns: {
        walletLinkSignature: true,
        walletLinkDeadline: true,
        erc8004AgentId: true,
      },
      with: { agentWallet: { columns: { address: true } } },
    })
    if (!profile?.walletLinkSignature) return null
    return {
      signature: profile.walletLinkSignature,
      deadline: profile.walletLinkDeadline!,
      agentWalletAddress: profile.agentWallet?.address ?? "",
      erc8004AgentId: profile.erc8004AgentId ?? "",
    }
  }

  async function listAllCompletedAgents() {
    return db.query.agentProfile.findMany({
      where: (p, { gte }) => gte(p.registrationStep, 3),
      with: { agentWallet: { columns: { address: true } } },
      orderBy: (p, { desc }) => [desc(p.createdAt)],
    })
  }

  async function getPrimaryWalletAddress(params: {
    userId: UserId
  }): Promise<string | null> {
    const wa = await db.query.walletAddress.findFirst({
      where: (w, { eq }) => eq(w.userId, params.userId),
      columns: { address: true },
    })
    return wa?.address ?? null
  }

  async function updateUserProfile(params: {
    userId: UserId
    name: string
    image: string | null
  }) {
    await db
      .update(user)
      .set({ name: params.name, image: params.image })
      .where(eq(user.id, params.userId))
  }

  return {
    verifyWorldId,
    isWorldIdVerified,
    linkAgentWallet,
    deleteAgentWallet,
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
    storeWalletLinkSignature,
    getWalletLinkSignature,
    listAllCompletedAgents,
    getPrimaryWalletAddress,
    updateUserProfile,
  }
}

export type AuthService = ReturnType<typeof createAuthService>
