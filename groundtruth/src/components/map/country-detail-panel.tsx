"use client"

import { useLayoutEffect, useRef } from "react"
import { MapControlContainer } from "@/components/ui/map"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChatInput } from "@/components/chat/chat-input"
import { ChatMessageItem } from "@/components/chat/chat-message"
import { CountryEventsHeader } from "./country-events-header"
import { useChat } from "@/hooks/use-chat"
import { useSession } from "@/lib/auth-client"
import { useAppKit } from "@reown/appkit/react"
import type { WorldEventId } from "@/lib/typeid"
import {
  GlobeIcon,
  MessageCircleIcon,
  UsersIcon,
  WalletIcon,
  XIcon,
} from "lucide-react"

function isoToFlag(iso2: string): string {
  if (!iso2 || iso2.length !== 2) return ""
  return [...iso2.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("")
}

function formatCompact(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`
  return String(n)
}

export function CountryDetailPanel({
  countryIso3,
  countryName,
  countryProperties,
  onClose,
  onSelectEvent,
}: {
  countryIso3: string
  countryName: string
  countryProperties: Record<string, unknown> | null
  onClose: () => void
  onSelectEvent: (id: WorldEventId) => void
}) {
  const { messages, send } = useChat({ kind: "country", countryIso3 })
  const { data: sessionData } = useSession()
  const isSignedIn = !!sessionData?.session
  const { open: openAppKit } = useAppKit()
  const scrollRef = useRef<HTMLDivElement>(null)

  const messageList = messages.data ?? []

  const iso2 = (countryProperties?.ISO_A2 as string) ?? ""
  const flag = isoToFlag(iso2)
  const continent = (countryProperties?.CONTINENT as string) ?? ""
  const population = countryProperties?.POP_EST as number | undefined
  const gdp = countryProperties?.GDP_MD as number | undefined

  useLayoutEffect(() => {
    if (scrollRef.current) {
      const viewport =
        scrollRef.current.closest("[data-slot='scroll-area-viewport']") ??
        scrollRef.current
      viewport.scrollTop = viewport.scrollHeight
    }
  }, [messageList.length])

  function handleSend(content: string) {
    send.mutate({ content })
  }

  return (
    <MapControlContainer className="absolute top-0 right-0 z-[1000] h-full w-[calc(100vw-3rem)] sm:w-80">
      <div className="sidebar-grain flex h-full max-h-full w-full flex-col border-l bg-background/90 backdrop-blur-md dark:border-white/[0.06]">
        {/* Header */}
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            {flag && <span className="text-lg">{flag}</span>}
            <span className="truncate text-sm font-semibold">{countryName}</span>
            {continent && (
              <Badge variant="outline" className="shrink-0 text-[10px]">
                {continent}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon-touch"
            className="shrink-0"
            aria-label="Close panel"
            onClick={onClose}
          >
            <XIcon />
          </Button>
        </div>

        {/* Country stats */}
        {(population || gdp) && (
          <div className="flex items-center gap-3 border-b px-3 py-1.5 text-[11px] text-muted-foreground">
            {population != null && (
              <span className="flex items-center gap-1">
                <UsersIcon size={10} />
                {formatCompact(population)}
              </span>
            )}
            {gdp != null && (
              <span className="flex items-center gap-1">
                <GlobeIcon size={10} />
                ${formatCompact(gdp * 1e6)}
              </span>
            )}
          </div>
        )}

        {/* Recent events pre-seed */}
        <CountryEventsHeader
          iso3={countryIso3}
          countryName={countryName}
          onSelectEvent={onSelectEvent}
        />

        {/* Chat messages */}
        <ScrollArea className="flex-1 overflow-hidden">
          <div ref={scrollRef} className="flex flex-col">
            {messageList.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
                <MessageCircleIcon
                  size={20}
                  className="text-muted-foreground/40"
                />
                <p className="text-xs font-medium text-muted-foreground">
                  No messages yet
                </p>
                <p className="text-[11px] text-muted-foreground/60">
                  Be the first to discuss events in {countryName}
                </p>
              </div>
            ) : (
              messageList.map((msg) => (
                <ChatMessageItem key={msg.id} message={msg} />
              ))
            )}
          </div>
        </ScrollArea>

        {/* Chat input */}
        {isSignedIn ? (
          <ChatInput onSend={handleSend} disabled={send.isPending} />
        ) : (
          <button
            onClick={() => openAppKit()}
            className="flex w-full items-center gap-2 border-t px-3 py-3 text-left transition-colors hover:bg-muted/50"
          >
            <WalletIcon size={14} className="text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Connect wallet to chat
            </p>
          </button>
        )}
      </div>
    </MapControlContainer>
  )
}
