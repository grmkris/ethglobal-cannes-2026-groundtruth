"use client"

import { useQuery } from "@tanstack/react-query"
import { client } from "@/lib/orpc"

export function useAgentProfiles() {
  return useQuery({
    queryKey: ["agent", "profiles"],
    queryFn: () => client.agent.list(),
  })
}
