"use client"

import { useReadContract } from "wagmi"
import { mainnet } from "wagmi/chains"
import { ERC8004_IDENTITY_REGISTRY, identityRegistryAbi } from "@/lib/contracts"

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

export function useOnchainWallet(agentId: string | undefined) {
  const result = useReadContract({
    chainId: mainnet.id,
    address: ERC8004_IDENTITY_REGISTRY,
    abi: identityRegistryAbi,
    functionName: "getAgentWallet",
    args: agentId ? [BigInt(agentId)] : undefined,
    query: { enabled: !!agentId },
  })

  const linked = result.data != null && result.data !== ZERO_ADDRESS

  return { ...result, linked }
}
