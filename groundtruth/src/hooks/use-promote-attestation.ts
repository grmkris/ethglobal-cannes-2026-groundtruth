"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useWriteContract } from "wagmi"
import type { Hex } from "viem"
import { client } from "@/lib/orpc"
import { mainnet } from "wagmi/chains"

/**
 * Promote an offchain EAS attestation on-chain by calling EAS.attest()
 * from the connected wallet. Used for escalation — everyday flows stay
 * offchain (free). Mainnet gas for a single attest() is ~$5–20 depending
 * on schema data size and current gas price.
 */
export function usePromoteAttestation() {
  const queryClient = useQueryClient()
  const { writeContractAsync } = useWriteContract()

  return useMutation({
    mutationFn: async (params: { uid: Hex }) => {
      // 1. Fetch the prepared tx data from the server.
      const prepared = await client.attestation.prepareOnchainPromotion({
        uid: params.uid,
      })

      // 2. Submit via wagmi writeContract against mainnet.
      const txHash = (await writeContractAsync({
        address: prepared.to,
        abi: prepared.abi,
        functionName: prepared.functionName,
        args: prepared.args,
        chainId: mainnet.id,
      })) as Hex

      return { uid: params.uid, txHash }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attestation"] })
    },
  })
}

/**
 * After the promotion tx confirms on-chain, call this to record the
 * block number + tx hash back to the server so the row's chain field
 * flips from 0 (offchain) to 1 (mainnet).
 */
export function useMarkAttestationPromoted() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (params: {
      uid: Hex
      txHash: Hex
      blockNumber: bigint
    }) => {
      return client.attestation.markPromoted({
        uid: params.uid,
        txHash: params.txHash,
        blockNumber: params.blockNumber.toString(),
        chain: mainnet.id,
      })
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["attestation", variables.uid] })
    },
  })
}
