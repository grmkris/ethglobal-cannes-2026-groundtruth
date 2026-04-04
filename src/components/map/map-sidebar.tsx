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
import { useSession } from "@/lib/auth-client"
import type { EventCategory, SeverityLevel, WorldEvent } from "@/lib/orpc-types"
import type { WorldEventId } from "@/lib/typeid"
import { useChat } from "@/hooks/use-chat"
import { cn } from "@/lib/utils"
import {
  ArrowLeftIcon,
  BadgeCheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MessageCircleIcon,
  MoonIcon,
  SearchIcon,
  SunIcon,
  WalletIcon,
} from "lucide-react"
import { useLayoutEffect, useRef } from "react"
import { useTheme } from "next-themes"
import { CategoryFilter } from "./category-filter"
import { WorldIdVerifyButton } from "@/components/world-id-verify-button"

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
}: {
  event: WorldEvent
  index: number
  isSelected: boolean
  onFlyTo: (coordinates: [number, number]) => void
  onSelectEvent: (eventId: WorldEventId) => void
  onOpenChat: (eventId: WorldEventId) => void
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
      }}
    >
      <div className="mb-1 flex items-center gap-1.5">
        <span className={cn("size-1.5 rounded-full", SEVERITY_DOT[event.severity])} />
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
      <p className="mt-0.5 text-[11px] text-muted-foreground">{event.location}</p>
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
  searchQuery: string
  selectedEventId: WorldEventId | null
  selectedEvent: WorldEvent | null
  activeTab: SidebarTab
  collapsed: boolean
  onToggleCategory: (category: EventCategory) => void
  onToggleSeverity: (severity: SeverityLevel) => void
  onSearchChange: (query: string) => void
  onClearFilters: () => void
  onSelectEvent: (eventId: WorldEventId | null) => void
  onTabChange: (tab: SidebarTab) => void
  onCollapsedChange: (collapsed: boolean) => void
  onFlyTo: (coordinates: [number, number]) => void
}) {
  const { data: sessionData } = useSession()
  const isSignedIn = !!sessionData?.session
  const { resolvedTheme, setTheme } = useTheme()
  const scrollRef = useRef<HTMLDivElement>(null)

  const chatEventId = activeTab === "chat" ? selectedEventId : null
  const { messages, send } = useChat(chatEventId, { enabled: activeTab === "chat" })
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
    onTabChange("chat")
    onCollapsedChange(false)
  }

  function handleSend(content: string) {
    send.mutate({ content })
  }

  return (
    <MapControlContainer
      className={cn(
        "absolute top-2 left-2 z-[1000] flex transition-all duration-300",
        collapsed ? "w-10" : "w-[calc(100vw-3rem)] sm:w-80"
      )}
    >
      {collapsed ? (
        <div className="flex flex-col gap-1.5">
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

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Open chat"
                  onClick={() => {
                    onCollapsedChange(false)
                    onTabChange("chat")
                  }}
                  className="bg-background/90 shadow-lg backdrop-blur-md"
                />
              }
            >
              <MessageCircleIcon size={16} />
            </TooltipTrigger>
            <TooltipContent side="right">Open chat</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Toggle theme"
                  onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                  className="bg-background/90 shadow-lg backdrop-blur-md"
                />
              }
            >
              {resolvedTheme === "dark" ? <SunIcon size={16} /> : <MoonIcon size={16} />}
            </TooltipTrigger>
            <TooltipContent side="right">Toggle theme</TooltipContent>
          </Tooltip>
        </div>
      ) : (
        <div className="sidebar-grain flex h-[calc(100svh-1rem)] max-h-[calc(100svh-1rem)] w-full flex-col rounded-lg border bg-background/90 shadow-lg backdrop-blur-md dark:border-white/[0.06] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
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
            <div className="ml-auto flex items-center gap-1">
              {isSignedIn && <WorldIdVerifyButton />}
              <appkit-button size="sm" />
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Toggle theme"
                      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                    />
                  }
                >
                  {resolvedTheme === "dark" ? <SunIcon size={12} /> : <MoonIcon size={12} />}
                </TooltipTrigger>
                <TooltipContent>Toggle theme</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-xs"
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
          </div>

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
                {selectedEventId ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto px-1 py-0.5 text-[11px] text-muted-foreground"
                      onClick={() => onSelectEvent(null)}
                    >
                      <ArrowLeftIcon size={10} />
                      Global
                    </Button>
                    <span className="truncate text-xs font-medium">
                      {selectedEvent?.title ?? "Event Chat"}
                    </span>
                  </>
                ) : (
                  <span className="text-xs font-medium">Global Chat</span>
                )}
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
                <div className="flex items-center gap-2 border-t px-3 py-3">
                  <WalletIcon size={14} className="text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    Connect wallet to chat
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </MapControlContainer>
  )
}
