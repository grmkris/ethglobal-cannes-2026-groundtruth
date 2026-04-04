"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { client } from "@/lib/orpc"
import { toast } from "sonner"

export function useAgentWallets() {
  const queryClient = useQueryClient()

  const agents = useQuery({
    queryKey: ["worldId", "agents"],
    queryFn: () => client.worldId.getAgents(),
  })

  const link = useMutation({
    mutationFn: (params: { agentAddress: string }) =>
      client.worldId.linkAgent(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worldId", "agents"] })
      toast.success("Agent wallet linked")
    },
    onError: (error) => {
      toast.error("Failed to link agent", {
        description: error.message,
      })
    },
  })

  return { agents, link }
}
