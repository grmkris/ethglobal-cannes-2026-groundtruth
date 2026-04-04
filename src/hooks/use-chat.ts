"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { client } from "@/lib/orpc"
import type { WorldEventId } from "@/lib/typeid"

export function useChat(eventId?: WorldEventId | null) {
  const queryClient = useQueryClient()
  const queryKey = ["chat", "messages", eventId ?? "global"]

  const messages = useQuery({
    queryKey,
    queryFn: () =>
      client.chat.getMessages({
        eventId: eventId ?? null,
        limit: 50,
      }),
    refetchInterval: 3000,
  })

  const send = useMutation({
    mutationFn: (params: { authorName: string; content: string }) =>
      client.chat.send({
        eventId: eventId ?? null,
        authorName: params.authorName,
        content: params.content,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  return { messages, send }
}
