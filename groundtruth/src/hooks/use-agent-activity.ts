"use client"

import { useQuery } from "@tanstack/react-query"
import { client } from "@/lib/orpc"

export function useAgentActivity() {
  return useQuery({
    queryKey: ["events", "agentActivity"],
    queryFn: () => client.event.getAgentActivity(),
    staleTime: 10_000,
    refetchInterval: 10_000,
  })
}
