"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { client } from "@/lib/orpc"
import { toast } from "sonner"

export function useCreateEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: Parameters<typeof client.event.create>[0]) =>
      client.event.create(input),
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
