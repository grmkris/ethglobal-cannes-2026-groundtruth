"use client"

import { useQuery } from "@tanstack/react-query"
import { client } from "@/lib/orpc"

export function useEvents() {
  return useQuery({
    queryKey: ["events", "getAll"],
    queryFn: () => client.event.getAll(),
  })
}
