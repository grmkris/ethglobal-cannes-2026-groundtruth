"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useAccount, useSignTypedData, useWriteContract } from "wagmi"
import { keccak256, toHex, type Hex } from "viem"
import { client } from "@/lib/orpc"
import {
  ERC8004_REPUTATION_REGISTRY,
  reputationRegistryAbi,
} from "@/lib/contracts"
import { DISPUTE_VALUES, type DisputeReason } from "@/lib/event-constants"
import {
  buildOffchainAttestation,
  DISPUTE_SCHEMA,
  DISPUTE_REASON_CODES,
} from "@/lib/eas"
import type { WorldEventId } from "@/lib/typeid"

const ENDPOINT =
  typeof window !== "undefined" ? window.location.origin : ""

/**
 * Dispute flow (Phase 5 of EAS integration):
 *   1. Build + sign an offchain EAS Dispute attestation with the connected wallet
 *   2. POST it to /attestation.create (server verifies via verifyTypedData)
 *   3. Call ERC-8004 ReputationRegistry.giveFeedback() on mainnet with the EAS UID
 *      embedded in feedbackURI so anyone reading the on-chain feedback can find
 *      the signed structured data
 *   4. Record the dispute in our DB with both txHash and attestationUid
 */
export function useDisputeEvent() {
  const queryClient = useQueryClient()
  const { address } = useAccount()
  const { signTypedDataAsync } = useSignTypedData()
  const { writeContractAsync } = useWriteContract()

  return useMutation({
    mutationFn: async (params: {
      eventId: WorldEventId
      agentId: string
      reason: DisputeReason
      justification: string
      category: string
      evidenceURI?: string
    }) => {
      const { eventId, agentId, reason, justification, category, evidenceURI } = params
      if (!address) throw new Error("Wallet not connected")

      const value = DISPUTE_VALUES[reason]
      const justificationHash = keccak256(toHex(justification || "dispute"))

      // --- 1. Build + sign the EAS Dispute attestation ---
      const schemaData = {
        eventId,
        reasonCode: DISPUTE_REASON_CODES[reason],
        justification: justification ?? "",
        evidenceURI: evidenceURI ?? "",
        justificationHash,
      }
      const unsigned = buildOffchainAttestation({
        schema: DISPUTE_SCHEMA,
        data: schemaData,
        attester: address,
      })
      const signature = (await signTypedDataAsync({
        domain: unsigned.domain,
        types: unsigned.types,
        primaryType: unsigned.primaryType,
        message: unsigned.message,
      })) as Hex

      // --- 2. Persist the attestation server-side ---
      const stored = await client.attestation.create({
        schemaUid: DISPUTE_SCHEMA.uid,
        refType: "event",
        refId: eventId,
        data: schemaData,
        attester: address,
        signature,
        time: unsigned.time.toString(),
        expirationTime: unsigned.expirationTime.toString(),
        refUID: unsigned.refUID,
      })

      // --- 3. Submit ERC-8004 giveFeedback with the EAS UID as feedbackURI ---
      // The feedbackURI now points at the EAS attestation instead of an internal
      // API endpoint, so any reader can look up the signed structured payload.
      const feedbackURI = `eas://attestation/${stored.uid}`
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
          justificationHash,
        ],
      })

      // --- 4. Record dispute in DB (includes attestationUid) ---
      await client.event.dispute({
        eventId,
        reason,
        justification,
        txHash,
        attestationUid: stored.uid,
      })

      return { txHash, attestationUid: stored.uid }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event"] })
      queryClient.invalidateQueries({ queryKey: ["reputation"] })
    },
  })
}
