"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import { keccak256, toHex } from "viem"
import { client } from "@/lib/orpc"
import {
  ERC8004_REPUTATION_REGISTRY,
  reputationRegistryAbi,
} from "@/lib/contracts"
import { DISPUTE_VALUES, type DisputeReason } from "@/server/db/schema/event/event.db"
import type { WorldEventId } from "@/lib/typeid"

const ENDPOINT = "https://ethglobal-cannes-2026-groundtruth.vercel.app"

export function useDisputeEvent() {
  const queryClient = useQueryClient()
  const { writeContractAsync } = useWriteContract()

  return useMutation({
    mutationFn: async (params: {
      eventId: WorldEventId
      agentId: string
      reason: DisputeReason
      justification: string
      category: string
    }) => {
      const { eventId, agentId, reason, justification, category } = params
      const value = DISPUTE_VALUES[reason]
      const feedbackURI = `${ENDPOINT}/api/rpc/event.getById?id=${eventId}`
      const feedbackHash = keccak256(toHex(justification || "dispute"))

      // 1. Send on-chain giveFeedback TX
      const txHash = await writeContractAsync({
        address: ERC8004_REPUTATION_REGISTRY,
        abi: reputationRegistryAbi,
        functionName: "giveFeedback",
        args: [
          BigInt(agentId),
          BigInt(value),
          0,
          "accuracy",
          category,
          ENDPOINT,
          feedbackURI,
          feedbackHash,
        ],
      })

      // 2. Record dispute in DB
      await client.event.dispute({
        eventId,
        reason,
        justification,
        txHash,
      })

      return { txHash }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event"] })
      queryClient.invalidateQueries({ queryKey: ["reputation"] })
    },
  })
}
