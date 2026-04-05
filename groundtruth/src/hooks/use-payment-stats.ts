"use client"

import { useQuery } from "@tanstack/react-query"
import { client } from "@/lib/orpc"

export function usePaymentStats() {
  return useQuery({
    queryKey: ["payment", "stats"],
    queryFn: () => client.payment.stats({}),
    refetchInterval: 15_000,
  })
}

export function useRevenueLeaderboard() {
  return useQuery({
    queryKey: ["payment", "leaderboard"],
    queryFn: () => client.payment.leaderboard({}),
    refetchInterval: 30_000,
  })
}
