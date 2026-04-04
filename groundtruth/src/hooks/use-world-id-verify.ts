"use client"

import { useMutation, useQuery } from "@tanstack/react-query"
import { client } from "@/lib/orpc"
import { authClient } from "@/lib/auth-client"
import type { IDKitResult } from "@worldcoin/idkit"
import { toast } from "sonner"

export function useWorldIdVerify() {
  const signature = useQuery({
    queryKey: ["worldId", "signature"],
    queryFn: () => client.worldId.getSignature(),
    enabled: false,
  })

  const verify = useMutation({
    mutationFn: (params: { result: IDKitResult }) =>
      client.worldId.verify(params.result as Parameters<typeof client.worldId.verify>[0]),
    onSuccess: () => {
      authClient.$store.notify("$sessionSignal")
      toast.success("World ID verified!")
    },
    onError: (error) => {
      toast.error("Verification failed", {
        description: error.message,
      })
    },
  })

  async function fetchSignature() {
    const result = await signature.refetch()
    return result.data ?? null
  }

  return { fetchSignature, verify }
}
