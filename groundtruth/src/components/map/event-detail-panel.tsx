"use client"

import { useLayoutEffect, useRef } from "react"
import { MapControlContainer } from "@/components/ui/map"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChatInput } from "@/components/chat/chat-input"
import { ChatMessageItem } from "@/components/chat/chat-message"
import { getCategoryConfig } from "@/lib/event-categories"
import { agentExplorerUrl, ensAppUrl, etherscanUrl } from "@/lib/explorers"
import { useChat } from "@/hooks/use-chat"
import { useAgentReputation } from "@/hooks/use-agent-reputation"
import { useSession } from "@/lib/auth-client"
import { useAppKit } from "@reown/appkit/react"
import { ConfidenceMeter } from "./confidence-meter"
import { DisputeModal } from "@/components/dispute-modal"
import { RelatedContext } from "./related-context"
import type { SeverityLevel, WorldEvent } from "@/lib/orpc-types"
import type { WorldEventId } from "@/lib/typeid"
import { cn } from "@/lib/utils"
import {
  AlertTriangleIcon,
  BadgeCheckIcon,
  BotIcon,
  ExternalLinkIcon,
  MapPinIcon,
  MessageCircleIcon,
  UsersIcon,
  WalletIcon,
  XIcon,
} from "lucide-react"

const SEVERITY_STYLES: Record<SeverityLevel, string> = {
  critical: "bg-red-500/10 text-red-500 border-red-500/20",
  high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  low: "bg-green-500/10 text-green-500 border-green-500/20",
}

export function EventDetailPanel({
  event,
  onClose,
  onShowOnMap,
}: {
  event: WorldEvent
  onClose: () => void
  onShowOnMap: (coordinates: [number, number]) => void
}) {
  const { messages, send } = useChat(event.id)
  const { data: sessionData } = useSession()
  const isSignedIn = !!sessionData?.session
  const isWorldIdVerified = sessionData?.user?.worldIdVerified ?? false
  const { open: openAppKit } = useAppKit()
  const reputation = useAgentReputation(event.erc8004AgentId ?? undefined)
  const scrollRef = useRef<HTMLDivElement>(null)

  const config = getCategoryConfig(event.category)
  const time = new Date(event.timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  const messageList = messages.data ?? []

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
            <Badge
              variant="outline"
              className={cn("shrink-0 text-[10px]", config.color)}
            >
              {config.emoji} {config.label}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "shrink-0 text-[10px] uppercase",
                SEVERITY_STYLES[event.severity]
              )}
            >
              {event.severity}
            </Badge>
            {event.worldIdVerified && (
              <Badge
                variant="outline"
                className="shrink-0 gap-0.5 text-[10px] text-emerald-500 border-emerald-500/20 bg-emerald-500/10"
              >
                <BadgeCheckIcon size={10} />
                Verified
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon-touch"
            className="shrink-0"
            aria-label="Show on map"
            onClick={() => onShowOnMap(event.coordinates)}
          >
            <MapPinIcon />
          </Button>
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

        {/* Event details (scrollable) */}
        <ScrollArea className="flex-1 overflow-hidden">
          <div className="space-y-3 px-3 py-3">
            {event.imageUrls.length > 0 && (
              <img
                src={event.imageUrls[0]}
                alt={event.title}
                className="h-32 w-full rounded-md object-cover"
              />
            )}

            <h3 className="text-sm font-semibold leading-tight">
              {event.title}
            </h3>

            {"confidenceScore" in event && (
              <ConfidenceMeter
                score={(event as any).confidenceScore}
                level={(event as any).confidenceLevel}
              />
            )}

            <p className="text-xs leading-relaxed text-muted-foreground">
              {event.description}
            </p>

            {/* Agent identity */}
            {event.agentAddress ? (
              <div className="rounded-md border border-violet-500/10 bg-violet-500/5 px-2 py-1.5 space-y-1">
                <div className="flex items-center gap-1 text-[10px] flex-wrap">
                  <span className="text-muted-foreground">by</span>
                  <a
                    href={etherscanUrl("address", event.agentAddress)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-foreground hover:underline"
                  >
                    {event.creatorName}
                  </a>
                  {event.worldIdVerified && (
                    <BadgeCheckIcon size={9} className="shrink-0 text-emerald-500" />
                  )}
                  <span className="text-muted-foreground/40">·</span>
                  <BotIcon size={9} className="shrink-0 text-violet-500" />
                  {event.agentEnsName ? (
                    <a
                      href={ensAppUrl(event.agentEnsName)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono font-medium text-violet-500 hover:underline"
                    >
                      {event.agentEnsName}
                    </a>
                  ) : (
                    <span className="font-mono text-muted-foreground">
                      {event.agentAddress.slice(0, 6)}...{event.agentAddress.slice(-4)}
                    </span>
                  )}
                  {event.onChainVerified && (
                    <BadgeCheckIcon size={9} className="shrink-0 text-emerald-500" />
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  {event.erc8004AgentId && (
                    <>
                      <a
                        href={agentExplorerUrl(event.erc8004AgentId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-foreground hover:underline"
                      >
                        ERC-8004 #{event.erc8004AgentId}
                        <ExternalLinkIcon size={7} className="ml-0.5 inline" />
                      </a>
                    </>
                  )}
                  {event.erc8004AgentId && reputation.data && (
                    <span className="text-muted-foreground/40">·</span>
                  )}
                  {reputation.data && (
                    <span>
                      Rep: {reputation.data.value} ({reputation.data.count} reviews)
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="truncate font-medium">
                  {event.creatorName}
                </span>
                {event.worldIdVerified && (
                  <BadgeCheckIcon size={9} className="text-emerald-500" />
                )}
              </div>
            )}

            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{event.location}</span>
              <span>{time}</span>
            </div>

            {/* Corroboration + Dispute badges */}
            <div className="flex items-center gap-2">
              {event.corroborationCount > 0 && (
                <Badge
                  variant="outline"
                  className="gap-0.5 text-[10px] text-blue-500 border-blue-500/20 bg-blue-500/10"
                >
                  <UsersIcon size={9} />
                  {event.corroborationCount} corroboration{event.corroborationCount !== 1 ? "s" : ""}
                </Badge>
              )}
              {event.disputeCount > 0 && (
                <Badge
                  variant="outline"
                  className="gap-0.5 text-[10px] text-red-500 border-red-500/20 bg-red-500/10"
                >
                  <AlertTriangleIcon size={9} />
                  {event.disputeCount} dispute{event.disputeCount !== 1 ? "s" : ""}
                </Badge>
              )}
              {isWorldIdVerified && event.agentAddress && event.erc8004AgentId && (
                <DisputeModal
                  eventId={event.id}
                  agentId={event.erc8004AgentId}
                  category={event.category}
                >
                  <Button variant="ghost" size="sm" className="h-5 gap-1 px-1.5 text-[10px] text-red-500 hover:text-red-600">
                    <AlertTriangleIcon size={9} />
                    Dispute
                  </Button>
                </DisputeModal>
              )}
            </div>

            {event.source && (
              <div className="text-[10px] text-muted-foreground/60">
                via{" "}
                {(() => {
                  try {
                    const domain = new URL(event.source).hostname.replace(
                      /^www\./,
                      ""
                    )
                    return (
                      <a
                        href={event.source}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline decoration-muted-foreground/30 hover:decoration-muted-foreground/60 hover:text-muted-foreground"
                      >
                        {domain}
                      </a>
                    )
                  } catch {
                    return <span>{event.source}</span>
                  }
                })()}
              </div>
            )}

            <RelatedContext event={event} onShowOnMap={onShowOnMap} />
          </div>

          {/* Chat section */}
          <div className="border-t">
            <div className="flex items-center gap-2 px-3 py-1.5">
              <MessageCircleIcon
                size={10}
                className="text-muted-foreground/60"
              />
              <span className="text-[10px] font-medium text-muted-foreground/60">
                {messageList.length} message
                {messageList.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div ref={scrollRef}>
              {messageList.length === 0 ? (
                <div className="flex flex-col items-center gap-1 px-4 py-6 text-center">
                  <MessageCircleIcon
                    size={16}
                    className="text-muted-foreground/40"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    No messages yet
                  </p>
                  <p className="text-[10px] text-muted-foreground/60">
                    Be the first to discuss this event
                  </p>
                </div>
              ) : (
                messageList.map((msg) => (
                  <ChatMessageItem key={msg.id} message={msg} />
                ))
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Chat input (sticky bottom) */}
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
