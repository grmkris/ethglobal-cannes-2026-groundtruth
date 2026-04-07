"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useAccount, useSignTypedData } from "wagmi"
import type { Address, Hex } from "viem"
import { client } from "@/lib/orpc"
import {
  buildOffchainAttestation,
  type GroundTruthSchema,
} from "@/lib/eas"

/**
 * Sign an offchain EAS attestation with the connected wallet and POST
 * it to the server. Works with EOA, injected wallets, and Reown
 * embedded smart wallets — the server-side verifyTypedData handles all
 * three transparently via ERC-1271 / ERC-6492.
 */
export function useSignAttestation() {
  const { address } = useAccount()
  const { signTypedDataAsync } = useSignTypedData()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      schema: GroundTruthSchema
      data: Record<string, unknown>
      refType: "event" | "agent" | "user" | "source"
      refId: string
      recipient?: Address
    }) => {
      if (!address) throw new Error("Wallet not connected")

      // Build the unsigned attestation locally so we have the canonical
      // UID, timestamp, and typed data shape before prompting the signer.
      const unsigned = buildOffchainAttestation({
        schema: params.schema,
        data: params.data,
        attester: address,
        recipient: params.recipient,
      })

      const signature = (await signTypedDataAsync({
        domain: unsigned.domain,
        types: unsigned.types,
        primaryType: unsigned.primaryType,
        message: unsigned.message,
      })) as Hex

      const stored = await client.attestation.create({
        schemaUid: params.schema.uid,
        refType: params.refType,
        refId: params.refId,
        data: params.data,
        attester: address,
        recipient: params.recipient,
        signature,
        time: unsigned.time.toString(),
        expirationTime: unsigned.expirationTime.toString(),
        refUID: unsigned.refUID,
      })

      return stored
    },
    onSuccess: (_data, variables) => {
      // Invalidate queries that show attestation-backed data.
      queryClient.invalidateQueries({ queryKey: ["event", variables.refId] })
      queryClient.invalidateQueries({ queryKey: ["attestation", variables.refType, variables.refId] })
    },
  })
}
