"use client"

import { MapControlContainer } from "@/components/ui/map"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { ChatInput } from "@/components/chat/chat-input"
import { ChatMessageItem } from "@/components/chat/chat-message"
import { getCategoryConfig } from "@/lib/event-categories"
import { agentExplorerUrl } from "@/lib/explorers"
import { ConfidenceMeter } from "./confidence-meter"
import { useSession } from "@/lib/auth-client"
import type { EventCategory, SeverityLevel, WorldEvent } from "@/lib/orpc-types"
import type { WorldEventId } from "@/lib/typeid"
import { useChat } from "@/hooks/use-chat"
import { cn } from "@/lib/utils"
import {
  BadgeCheckIcon,
  BotIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MessageCircleIcon,
  SearchIcon,
  WalletIcon,
} from "lucide-react"
import { useLayoutEffect, useRef } from "react"
import { useAppKit } from "@reown/appkit/react"
import { CategoryFilter } from "./category-filter"
import { usePaymentStats } from "@/hooks/use-payment-stats"

const SEVERITY_DOT: Record<SeverityLevel, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
}

const SEVERITY_BORDER: Record<SeverityLevel, string> = {
  critical: "border-l-red-500",
  high: "border-l-orange-500",
  medium: "border-l-yellow-500",
  low: "border-l-green-500",
}

const SEVERITY_FILTERS = [
  { id: "critical" as const, label: "Critical", dot: "bg-red-500", active: "text-red-500 bg-red-500/10 border-red-500/20" },
  { id: "high" as const, label: "High", dot: "bg-orange-500", active: "text-orange-500 bg-orange-500/10 border-orange-500/20" },
  { id: "medium" as const, label: "Medium", dot: "bg-yellow-500", active: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20" },
  { id: "low" as const, label: "Low", dot: "bg-green-500", active: "text-green-500 bg-green-500/10 border-green-500/20" },
]

function EventListItem({
  event,
  index,
  isSelected,
  onFlyTo,
  onSelectEvent,
  onOpenChat,
  onCollapseMobile,
}: {
  event: WorldEvent
  index: number
  isSelected: boolean
  onFlyTo: (coordinates: [number, number]) => void
  onSelectEvent: (eventId: WorldEventId) => void
  onOpenChat: (eventId: WorldEventId) => void
  onCollapseMobile: () => void
}) {
  const config = getCategoryConfig(event.category)
  const time = new Date(event.timestamp).toLocaleString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <div
      className={cn(
        "animate-in fade-in slide-in-from-left-1 cursor-pointer border-b border-l-2 border-border/50 px-3 py-2.5 transition-colors hover:bg-muted/50",
        SEVERITY_BORDER[event.severity],
        isSelected && "bg-muted/70"
      )}
      style={{ animationDelay: `${index * 30}ms`, animationFillMode: "backwards" }}
      onClick={() => {
        onSelectEvent(event.id)
        onFlyTo(event.coordinates)
        onCollapseMobile()
      }}
    >
      <div className="mb-1 flex items-center gap-1.5">
        <span className={cn("size-1.5 rounded-full", SEVERITY_DOT[event.severity])} />
        {"confidenceScore" in event && (
          <ConfidenceMeter score={(event as any).confidenceScore} level={(event as any).confidenceLevel} compact />
        )}
        <span className="text-[11px] text-muted-foreground">
          {config.emoji} {config.label}
        </span>
        {event.worldIdVerified && (
          <Tooltip>
            <TooltipTrigger
              render={
                <BadgeCheckIcon
                  size={11}
                  className="shrink-0 text-emerald-500"
                />
              }
            />
            <TooltipContent>Verified reporter</TooltipContent>
          </Tooltip>
        )}
        <Button
          variant="ghost"
          size="icon-xs"
          className="ml-auto size-5"
          aria-label="Open chat"
          onClick={(e) => {
            e.stopPropagation()
            onOpenChat(event.id)
          }}
        >
          <MessageCircleIcon size={10} />
        </Button>
        <span className="text-[10px] text-muted-foreground">{time}</span>
      </div>
      <h4 className="text-xs font-medium leading-snug">{event.title}</h4>
      <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
        <span>{event.location}</span>
        <span className="text-muted-foreground/40">·</span>
        <span className="truncate">{event.creatorName}</span>
        {event.agentAddress && (
          <>
            <span className="text-muted-foreground/40">·</span>
            <BotIcon size={10} className="shrink-0 text-violet-500" />
            <span className="truncate text-violet-500">{event.agentEnsName ?? `${event.agentAddress.slice(0, 6)}...${event.agentAddress.slice(-4)}`}</span>
            {event.erc8004AgentId && <a href={agentExplorerUrl(event.erc8004AgentId)} target="_blank" rel="noopener noreferrer" className="shrink-0 text-[9px] text-violet-400 hover:underline">#{event.erc8004AgentId}</a>}
            {event.onChainVerified && <BadgeCheckIcon size={10} className="shrink-0 text-emerald-500" />}
          </>
        )}
      </div>
    </div>
  )
}

export type SidebarTab = "events" | "chat"

export function MapSidebar({
  filteredEvents,
  eventCount,
  activeCategories,
  activeSeverities,
  searchQuery,
  selectedEventId,
  selectedEvent,
  activeTab,
  collapsed,
  onToggleCategory,
  onToggleSeverity,
  onToggleVerified,
  verifiedOnly,
  onSearchChange,
  onClearFilters,
  onSelectEvent,
  onTabChange,
  onCollapsedChange,
  onFlyTo,
}: {
  filteredEvents: WorldEvent[]
  eventCount: number
  activeCategories: Set<EventCategory>
  activeSeverities: Set<SeverityLevel>
  verifiedOnly: boolean
  searchQuery: string
  selectedEventId: WorldEventId | null
  selectedEvent: WorldEvent | null
  activeTab: SidebarTab
  collapsed: boolean
  onToggleCategory: (category: EventCategory) => void
  onToggleSeverity: (severity: SeverityLevel) => void
  onToggleVerified: () => void
  onSearchChange: (query: string) => void
  onClearFilters: () => void
  onSelectEvent: (eventId: WorldEventId | null) => void
  onTabChange: (tab: SidebarTab) => void
  onCollapsedChange: (collapsed: boolean) => void
  onFlyTo: (coordinates: [number, number]) => void
}) {
  const { data: sessionData } = useSession()
  const isSignedIn = !!sessionData?.session
  const { open: openAppKit } = useAppKit()
  const scrollRef = useRef<HTMLDivElement>(null)
  const { data: paymentStats } = usePaymentStats()

  const { messages, send } = useChat(null, { enabled: activeTab === "chat" })
  const messageList = messages.data ?? []

  // Legitimate effect — DOM sync (scroll to bottom on new messages)
  useLayoutEffect(() => {
    if (scrollRef.current && activeTab === "chat") {
      const viewport = scrollRef.current.closest("[data-slot='scroll-area-viewport']")
        ?? scrollRef.current
      viewport.scrollTop = viewport.scrollHeight
    }
  }, [messageList.length, activeTab])

  function handleOpenChat(eventId: WorldEventId) {
    onSelectEvent(eventId)
    onCollapsedChange(false)
  }

  function handleSend(content: string) {
    send.mutate({ content })
  }

  return (
    <MapControlContainer
      className={cn(
        "absolute top-0 left-0 z-[1000] flex transition-all duration-300",
        collapsed ? "w-10" : "w-[calc(100vw-3rem)] sm:w-80"
      )}
    >
      {collapsed ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                aria-label="Expand sidebar"
                onClick={() => onCollapsedChange(false)}
                className="bg-background/90 shadow-lg backdrop-blur-md"
              />
            }
          >
            <ChevronRightIcon size={16} />
          </TooltipTrigger>
          <TooltipContent side="right">Expand sidebar</TooltipContent>
        </Tooltip>
      ) : (
        <div className="sidebar-grain flex h-svh max-h-svh w-full flex-col border-r bg-background/90 backdrop-blur-md dark:border-white/[0.06]">
          {/* Header */}
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              <h2 className="text-sm font-bold tracking-tight">
                Ground Truth
              </h2>
              <Badge variant="outline" className="h-4 px-1.5 py-0 font-mono text-[9px]">
                {eventCount} live
              </Badge>
            </div>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="ml-auto"
                    aria-label="Collapse sidebar"
                    onClick={() => onCollapsedChange(true)}
                  />
                }
              >
                <ChevronLeftIcon size={14} />
              </TooltipTrigger>
              <TooltipContent>Collapse sidebar</TooltipContent>
            </Tooltip>
          </div>

          {/* Micropayment stats bar */}
          {paymentStats && paymentStats.totalTransactions > 0 && (
            <div className="flex items-center gap-3 border-b px-3 py-1.5 font-mono text-[10px] text-muted-foreground">
              <span>{paymentStats.totalTransactions} txns</span>
              <span className="text-muted-foreground/40">|</span>
              <span className="text-emerald-500">${parseFloat(paymentStats.totalRevenueUsd).toFixed(4)} USDC</span>
              <span className="text-muted-foreground/40">|</span>
              <span>Arc</span>
            </div>
          )}

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={(v) => {
              if (v === "events" || v === "chat") onTabChange(v)
            }}
          >
            <TabsList variant="line" className="w-full border-b px-0">
              <TabsTrigger value="events" className="flex-1 text-xs">
                Events
              </TabsTrigger>
              <TabsTrigger value="chat" className="flex-1 text-xs">
                Chat
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Events Tab */}
          {activeTab === "events" && (
            <>
              <div className="space-y-2 border-b px-3 py-2">
                <div className="relative">
                  <SearchIcon size={12} className="absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search events..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    aria-label="Search events"
                    className="h-8 pl-7 text-xs"
                  />
                </div>
                <CategoryFilter
                  activeCategories={activeCategories}
                  onToggle={onToggleCategory}
                />
                <div className="flex flex-wrap gap-1.5">
                  {SEVERITY_FILTERS.map((s) => {
                    const isActive = activeSeverities.has(s.id)
                    return (
                      <button
                        key={s.id}
                        onClick={() => onToggleSeverity(s.id)}
                        aria-pressed={isActive}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium transition-all",
                          isActive
                            ? s.active
                            : "border-border text-muted-foreground opacity-40"
                        )}
                      >
                        <span className={cn("inline-block size-1.5 rounded-full", s.dot)} />
                        {s.label}
                      </button>
                    )
                  })}
                  <button
                    onClick={onToggleVerified}
                    aria-pressed={verifiedOnly}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium transition-all",
                      verifiedOnly
                        ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
                        : "border-border text-muted-foreground opacity-40"
                    )}
                  >
                    <BadgeCheckIcon size={10} />
                    Verified
                  </button>
                </div>
              </div>
              <ScrollArea className="flex-1 overflow-hidden">
                <div>
                  {filteredEvents.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
                      <SearchIcon size={20} className="text-muted-foreground/40" />
                      <p className="text-xs font-medium text-muted-foreground">No events match</p>
                      <p className="text-[11px] text-muted-foreground/60">
                        Try different filters or search terms
                      </p>
                      <Button variant="ghost" size="sm" onClick={onClearFilters}>
                        Clear all filters
                      </Button>
                    </div>
                  ) : (
                    filteredEvents.map((event, index) => (
                      <EventListItem
                        key={event.id}
                        event={event}
                        index={index}
                        isSelected={event.id === selectedEventId}
                        onFlyTo={onFlyTo}
                        onSelectEvent={onSelectEvent}
                        onOpenChat={handleOpenChat}
                        onCollapseMobile={() => {
                          if (window.innerWidth < 640) onCollapsedChange(true)
                        }}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            </>
          )}

          {/* Chat Tab */}
          {activeTab === "chat" && (
            <>
              <div className="flex items-center gap-2 border-b px-3 py-1.5">
                <span className="text-xs font-medium">Global Chat</span>
              </div>

              <ScrollArea className="flex-1 overflow-hidden">
                <div ref={scrollRef} className="flex flex-col">
                  {messageList.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
                      <MessageCircleIcon size={20} className="text-muted-foreground/40" />
                      <p className="text-xs font-medium text-muted-foreground">No messages yet</p>
                      <p className="text-[11px] text-muted-foreground/60">
                        Be the first to share intelligence
                      </p>
                    </div>
                  ) : (
                    messageList.map((msg) => (
                      <ChatMessageItem key={msg.id} message={msg} />
                    ))
                  )}
                </div>
              </ScrollArea>
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
            </>
          )}
        </div>
      )}
    </MapControlContainer>
  )
}
