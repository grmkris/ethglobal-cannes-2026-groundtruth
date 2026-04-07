"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { client } from "@/lib/orpc"
import type { WorldEventId } from "@/lib/typeid"
import { toast } from "sonner"

export type ChatScope =
  | { kind: "global" }
  | { kind: "event"; eventId: WorldEventId }
  | { kind: "country"; countryIso3: string }

export function selectChatScope(params: {
  selectedEventId: WorldEventId | null
  selectedCountryIso3: string | null
}): ChatScope {
  if (params.selectedEventId) {
    return { kind: "event", eventId: params.selectedEventId }
  }
  if (params.selectedCountryIso3) {
    return { kind: "country", countryIso3: params.selectedCountryIso3 }
  }
  return { kind: "global" }
}

function scopeKey(scope: ChatScope): string {
  if (scope.kind === "event") return scope.eventId
  if (scope.kind === "country") return scope.countryIso3
  return "global"
}

function scopeToInput(scope: ChatScope): {
  eventId: WorldEventId | null
  countryIso3: string | null
} {
  if (scope.kind === "event") {
    return { eventId: scope.eventId, countryIso3: null }
  }
  if (scope.kind === "country") {
    return { eventId: null, countryIso3: scope.countryIso3 }
  }
  return { eventId: null, countryIso3: null }
}

export function useChat(
  scope: ChatScope,
  options?: { enabled?: boolean }
) {
  const queryClient = useQueryClient()
  const queryKey = ["chat", "messages", scope.kind, scopeKey(scope)]
  const enabled = options?.enabled ?? true

  const messages = useQuery({
    queryKey,
    queryFn: () =>
      client.chat.getMessages({
        ...scopeToInput(scope),
        limit: 50,
      }),
    refetchInterval: enabled ? 3000 : false,
    enabled,
  })

  const send = useMutation({
    mutationFn: (params: { content: string }) =>
      client.chat.send({
        ...scopeToInput(scope),
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
