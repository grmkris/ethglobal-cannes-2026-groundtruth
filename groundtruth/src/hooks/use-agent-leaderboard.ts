"use client"

import { useQuery } from "@tanstack/react-query"
import { client } from "@/lib/orpc"

export function useAgentLeaderboard() {
  return useQuery({
    queryKey: ["agent", "leaderboard"],
    queryFn: () => client.agent.listAll({}),
    staleTime: 30_000,
  })
}
