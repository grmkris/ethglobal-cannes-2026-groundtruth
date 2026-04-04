"use client"

import { useQuery } from "@tanstack/react-query"
import { createPublicClient, http } from "viem"
import { worldchain } from "viem/chains"

const AGENT_BOOK_ADDRESS = "0xA23aB2712eA7BBa896930544C7d6636a96b944dA" as const

const agentBookAbi = [
  {
    name: "lookupHuman",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const

const worldchainClient = createPublicClient({
  chain: worldchain,
  transport: http(),
})

async function checkAgentBook(address: string): Promise<string | null> {
  const humanId = await worldchainClient.readContract({
    address: AGENT_BOOK_ADDRESS,
    abi: agentBookAbi,
    functionName: "lookupHuman",
    args: [address as `0x${string}`],
  })
  if (humanId === BigInt(0)) return null
  return `0x${humanId.toString(16)}`
}

export function useAgentBookStatus(address: string | undefined) {
  return useQuery({
    queryKey: ["agentbook", address],
    queryFn: () => checkAgentBook(address!),
    enabled: !!address,
    staleTime: 60_000,
  })
}
