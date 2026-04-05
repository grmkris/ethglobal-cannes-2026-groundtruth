"use client"

import { useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { client } from "@/lib/orpc"
import { toast } from "sonner"

export function useEvents() {
  const query = useQuery({
    queryKey: ["events", "getAll"],
    queryFn: async () => {
      const result = await client.event.getAll()
      return result.items
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  })

  // Legitimate effect — syncs external system (toast) with query error state
  useEffect(() => {
    if (query.error) {
      toast.error("Failed to load events", { description: query.error.message })
    }
  }, [query.error])

  return query
}
