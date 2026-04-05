import { createPublicClient, http } from "viem"
import { mainnet } from "viem/chains"
import {
  ERC8004_IDENTITY_REGISTRY,
  ERC8004_REPUTATION_REGISTRY,
  identityRegistryAbi,
  reputationRegistryAbi,
} from "@/lib/contracts"
import type { AuthService } from "./auth.service"

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

interface CacheEntry {
  verified: boolean
  expiry: number
}

export function createIdentityVerificationService(props: {
  infuraProjectId: string
  authService: AuthService
}) {
  const { infuraProjectId, authService } = props

  const client = createPublicClient({
    chain: mainnet,
    transport: http(`https://mainnet.infura.io/v3/${infuraProjectId}`),
  })

  const cache = new Map<string, CacheEntry>()

  /**
   * Verify that an agent's on-chain ERC-8004 identity links back to the
   * same user who linked the agent wallet.
   *
   * Chain of trust: ownerOf(agentId) → human wallet → user → agent wallet
   */
  async function verifyAgentIdentity(params: {
    erc8004AgentId: string
    agentAddress: string
  }): Promise<boolean> {
    const cacheKey = `${params.erc8004AgentId}:${params.agentAddress}`
    const cached = cache.get(cacheKey)
    if (cached && Date.now() < cached.expiry) return cached.verified

    try {
      const nftOwner = await client.readContract({
        address: ERC8004_IDENTITY_REGISTRY,
        abi: identityRegistryAbi,
        functionName: "ownerOf",
        args: [BigInt(params.erc8004AgentId)],
      })

      // Check if the NFT owner has a user account that also owns the agent wallet
      const ownerUser = await authService.getUserByAddress({
        address: nftOwner as string,
      })
      if (!ownerUser) {
        setCached(cacheKey, false)
        return false
      }

      const agentUser = await authService.getUserByAgentAddress({
        address: params.agentAddress,
      })
      if (!agentUser) {
        setCached(cacheKey, false)
        return false
      }

      // Same user owns the NFT and linked the agent wallet
      const verified = ownerUser.userId === agentUser.userId
      setCached(cacheKey, verified)
      return verified
    } catch {
      setCached(cacheKey, false)
      return false
    }
  }

  function setCached(key: string, verified: boolean) {
    cache.set(key, { verified, expiry: Date.now() + CACHE_TTL_MS })
  }

  async function getReputationSummary(params: {
    erc8004AgentId: string
  }): Promise<{ count: number; value: number } | null> {
    const cacheKey = `rep:${params.erc8004AgentId}`
    const cached = cache.get(cacheKey)
    if (cached && Date.now() < cached.expiry) {
      return cached.verified ? { count: 0, value: 0 } : null // simplified cache
    }

    try {
      const [count, summaryValue] = await client.readContract({
        address: ERC8004_REPUTATION_REGISTRY,
        abi: reputationRegistryAbi,
        functionName: "getSummary",
        args: [BigInt(params.erc8004AgentId), [], "", ""],
      })

      return { count: Number(count), value: Number(summaryValue) }
    } catch {
      return null
    }
  }

  return { verifyAgentIdentity, getReputationSummary }
}

export type IdentityVerificationService = ReturnType<typeof createIdentityVerificationService>
