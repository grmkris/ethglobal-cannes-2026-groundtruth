"use client"

import { useQuery } from "@tanstack/react-query"
import { createPublicClient, http } from "viem"
import { mainnet } from "viem/chains"
import { ERC8004_REPUTATION_REGISTRY, reputationRegistryAbi } from "@/lib/contracts"

const mainnetClient = createPublicClient({
  chain: mainnet,
  transport: http(),
})

async function fetchReputation(agentId: string) {
  const clients = await mainnetClient.readContract({
    address: ERC8004_REPUTATION_REGISTRY,
    abi: reputationRegistryAbi,
    functionName: "getClients",
    args: [BigInt(agentId)],
  })

  if (!clients.length) return { count: 0, value: 0, decimals: 0 }

  const [count, summaryValue, decimals] = await mainnetClient.readContract({
    address: ERC8004_REPUTATION_REGISTRY,
    abi: reputationRegistryAbi,
    functionName: "getSummary",
    args: [BigInt(agentId), clients as `0x${string}`[], "accuracy", ""],
  })

  return {
    count: Number(count),
    value: Number(summaryValue),
    decimals: Number(decimals),
  }
}

export function useAgentReputation(agentId: string | undefined) {
  return useQuery({
    queryKey: ["reputation", agentId],
    queryFn: () => fetchReputation(agentId!),
    enabled: !!agentId,
    staleTime: 60_000,
  })
}
