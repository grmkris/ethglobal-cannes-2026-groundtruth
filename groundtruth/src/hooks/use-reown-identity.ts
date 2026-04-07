"use client"

import { useQuery } from "@tanstack/react-query"
import { fetchReownIdentity, type ReownIdentity } from "@/lib/reown-identity"

/**
 * Live ENS / cross-chain name + avatar for a connected address, via the Reown
 * Identity API. Cached for an hour by React Query so it doesn't re-fetch on
 * every render.
 */
export function useReownIdentity(address?: string): {
  name: string | null
  avatar: string | null
  isLoading: boolean
} {
  const query = useQuery<ReownIdentity>({
    queryKey: ["reown-identity", address?.toLowerCase()],
    queryFn: () => fetchReownIdentity(address!),
    enabled: !!address,
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  })
  return {
    name: query.data?.name ?? null,
    avatar: query.data?.avatar ?? null,
    isLoading: query.isLoading,
  }
}
