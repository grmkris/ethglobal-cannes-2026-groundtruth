"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useAccount, useSignTypedData } from "wagmi"
import type { Hex } from "viem"
import { client } from "@/lib/orpc"
import { buildOffchainAttestation, SOURCE_CLAIM_SCHEMA } from "@/lib/eas"
import { toast } from "sonner"

/**
 * Create an event and optionally sign a GroundTruthSourceClaim EAS
 * attestation when the reporter provides a source URL. The attestation
 * is stored server-side and its UID is linked back to the event row so
 * Geo publishing can include it as a trust-stack reference.
 *
 * If the EAS signing step fails (user rejects, wallet error), the event
 * is still created — the attestation is a bonus, not a requirement.
 */
export function useCreateEvent() {
  const queryClient = useQueryClient()
  const { address } = useAccount()
  const { signTypedDataAsync } = useSignTypedData()

  return useMutation({
    mutationFn: async (input: Parameters<typeof client.event.create>[0]) => {
      // 1. Create the event in the DB
      const event = await client.event.create(input)

      // 2. If a source URL was provided and wallet is connected, sign a
      //    SourceClaim attestation and link it to the event.
      if (input.source && address) {
        try {
          const schemaData = {
            eventId: event.id,
            sourceURI: input.source,
            publishedAt: Math.floor(Date.now() / 1000),
            sourceType: 0, // 0 = unspecified
          }
          const unsigned = buildOffchainAttestation({
            schema: SOURCE_CLAIM_SCHEMA,
            data: schemaData,
            attester: address,
          })
          const signature = (await signTypedDataAsync({
            domain: unsigned.domain,
            types: unsigned.types,
            primaryType: unsigned.primaryType,
            message: unsigned.message,
          })) as Hex

          const stored = await client.attestation.create({
            schemaUid: SOURCE_CLAIM_SCHEMA.uid,
            refType: "event",
            refId: event.id,
            data: schemaData,
            attester: address,
            signature,
            time: unsigned.time.toString(),
            expirationTime: unsigned.expirationTime.toString(),
            refUID: unsigned.refUID,
          })

          await client.event.setSourceClaim({
            eventId: event.id,
            uid: stored.uid,
          })
        } catch (err) {
          // Event created successfully — attestation is optional.
          // Log but don't fail the mutation.
          console.warn("[create-event] SourceClaim attestation skipped:", err)
          toast.info("Event created (source attestation skipped)")
        }
      }

      return event
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] })
      toast.success("Event reported successfully")
    },
    onError: (error) => {
      toast.error("Failed to report event", {
        description: error.message,
      })
    },
  })
}
