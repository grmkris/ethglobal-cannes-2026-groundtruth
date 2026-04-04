"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { client } from "@/lib/orpc"
import type { WorldEventId } from "@/lib/typeid"
import { toast } from "sonner"

export function useChat(
  eventId?: WorldEventId | null,
  options?: { enabled?: boolean }
) {
  const queryClient = useQueryClient()
  const queryKey = ["chat", "messages", eventId ?? "global"]
  const enabled = options?.enabled ?? true

  const messages = useQuery({
    queryKey,
    queryFn: () =>
      client.chat.getMessages({
        eventId: eventId ?? null,
        limit: 50,
      }),
    refetchInterval: enabled ? 3000 : false,
    enabled,
  })

  const send = useMutation({
    mutationFn: (params: { content: string }) =>
      client.chat.send({
        eventId: eventId ?? null,
        content: params.content,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
    },
    onError: (error) => {
      toast.error("Failed to send message", {
        description: error.message,
      })
    },
  })

  return { messages, send }
}
