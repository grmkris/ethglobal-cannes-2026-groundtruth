"use client"

import { MapControlContainer } from "@/components/ui/map"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChatInput } from "@/components/chat/chat-input"
import { ChatMessageItem } from "@/components/chat/chat-message"
import { getCategoryConfig } from "@/lib/event-categories"
import type { EventCategory, SeverityLevel, WorldEvent } from "@/lib/orpc-types"
import type { WorldEventId } from "@/lib/typeid"
import { useChat } from "@/hooks/use-chat"
import { cn } from "@/lib/utils"
import {
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MessageCircleIcon,
  MoonIcon,
  SearchIcon,
  SunIcon,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useTheme } from "next-themes"
import { CategoryFilter } from "./category-filter"

const SEVERITY_DOT: Record<SeverityLevel, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
}

const AUTHOR_NAME_KEY = "groundtruth-author-name"

function getStoredAuthorName(): string {
  if (typeof window === "undefined") return ""
  return localStorage.getItem(AUTHOR_NAME_KEY) ?? ""
}

function EventListItem({
  event,
  onOpenChat,
}: {
  event: WorldEvent
  onOpenChat: (eventId: WorldEventId) => void
}) {
  const config = getCategoryConfig(event.category)
  const time = new Date(event.timestamp).toLocaleString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <div className="border-b border-border/50 px-3 py-2.5 transition-colors hover:bg-muted/50">
      <div className="mb-1 flex items-center gap-1.5">
        <span className={cn("size-1.5 rounded-full", SEVERITY_DOT[event.severity])} />
        <span className="text-[10px] text-muted-foreground">
          {config.emoji} {config.label}
        </span>
        <button
          onClick={() => onOpenChat(event.id as WorldEventId)}
          className="ml-auto flex items-center gap-1 rounded px-1 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <MessageCircleIcon size={10} />
        </button>
        <span className="text-[10px] text-muted-foreground">{time}</span>
      </div>
      <h4 className="text-xs font-medium leading-snug">{event.title}</h4>
      <p className="mt-0.5 text-[10px] text-muted-foreground">{event.location}</p>
    </div>
  )
}

type SidebarTab = "events" | "chat"

export function MapSidebar({
  filteredEvents,
  eventCount,
  activeCategories,
  searchQuery,
  selectedEventId,
  onToggleCategory,
  onSearchChange,
  onSelectEvent,
}: {
  filteredEvents: WorldEvent[]
  eventCount: number
  activeCategories: Set<EventCategory>
  searchQuery: string
  selectedEventId: WorldEventId | null
  onToggleCategory: (category: EventCategory) => void
  onSearchChange: (query: string) => void
  onSelectEvent: (eventId: WorldEventId | null) => void
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState<SidebarTab>("events")
  const [authorName, setAuthorName] = useState(getStoredAuthorName)
  const [showNameInput, setShowNameInput] = useState(!getStoredAuthorName())
  const { resolvedTheme, setTheme } = useTheme()
  const scrollRef = useRef<HTMLDivElement>(null)

  const chatEventId = activeTab === "chat" ? selectedEventId : null
  const { messages, send } = useChat(chatEventId)
  const messageList = messages.data ?? []

  const selectedEvent = selectedEventId
    ? filteredEvents.find((e) => e.id === selectedEventId)
    : null

  useEffect(() => {
    if (scrollRef.current && activeTab === "chat") {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messageList.length, activeTab])

  function handleOpenChat(eventId: WorldEventId) {
    onSelectEvent(eventId)
    setActiveTab("chat")
  }

  function handleSend(content: string) {
    if (!authorName.trim()) {
      setShowNameInput(true)
      return
    }
    send.mutate({ authorName, content })
  }

  function handleSetName(e: React.FormEvent) {
    e.preventDefault()
    if (authorName.trim()) {
      localStorage.setItem(AUTHOR_NAME_KEY, authorName.trim())
      setShowNameInput(false)
    }
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
          <button
            onClick={() => setCollapsed(false)}
            className="flex size-10 items-center justify-center rounded-lg border bg-background/90 shadow-lg backdrop-blur-md hover:bg-muted"
          >
            <ChevronRightIcon size={16} />
          </button>
          <button
            onClick={() => {
              setCollapsed(false)
              setActiveTab("chat")
            }}
            className="flex size-10 items-center justify-center rounded-lg border bg-background/90 shadow-lg backdrop-blur-md hover:bg-muted"
          >
            <MessageCircleIcon size={16} />
          </button>
          <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="flex size-10 items-center justify-center rounded-lg border bg-background/90 shadow-lg backdrop-blur-md hover:bg-muted"
          >
            {resolvedTheme === "dark" ? <SunIcon size={16} /> : <MoonIcon size={16} />}
          </button>
        </div>
      ) : (
        <div className="flex h-[calc(100svh-1rem)] max-h-[calc(100svh-1rem)] w-full flex-col rounded-lg border bg-background/90 shadow-lg backdrop-blur-md">
          {/* Header */}
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <h2 className="flex-1 truncate text-sm font-semibold tracking-tight">
              Ground Truth
            </h2>
            <div className="flex items-center gap-1">
              <span className="flex items-center gap-1 rounded-md bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-red-500" />
                </span>
                {eventCount}
              </span>
              <button
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                className="flex size-6 items-center justify-center rounded-md hover:bg-muted"
              >
                {resolvedTheme === "dark" ? <SunIcon size={12} /> : <MoonIcon size={12} />}
              </button>
              <button
                onClick={() => setCollapsed(true)}
                className="flex size-6 items-center justify-center rounded-md hover:bg-muted"
              >
                <ChevronLeftIcon size={14} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab("events")}
              className={cn(
                "flex-1 py-1.5 text-xs font-medium transition-colors",
                activeTab === "events"
                  ? "border-b-2 border-foreground text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Events
            </button>
            <button
              onClick={() => setActiveTab("chat")}
              className={cn(
                "flex-1 py-1.5 text-xs font-medium transition-colors",
                activeTab === "chat"
                  ? "border-b-2 border-foreground text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Chat
            </button>
          </div>

          {/* Events Tab */}
          {activeTab === "events" && (
            <>
              <div className="border-b px-3 py-2">
                <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-2 py-1.5">
                  <SearchIcon size={12} className="text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search events..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground/60"
                  />
                </div>
              </div>
              <div className="border-b px-3 py-2">
                <CategoryFilter
                  activeCategories={activeCategories}
                  onToggle={onToggleCategory}
                />
              </div>
              <ScrollArea className="flex-1 overflow-hidden">
                <div>
                  {filteredEvents.length === 0 ? (
                    <div className="px-3 py-8 text-center text-xs text-muted-foreground">
                      No events match filters
                    </div>
                  ) : (
                    filteredEvents.map((event) => (
                      <EventListItem
                        key={event.id}
                        event={event}
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
              {/* Chat sub-header */}
              <div className="flex items-center gap-2 border-b px-3 py-1.5">
                {selectedEventId ? (
                  <>
                    <button
                      onClick={() => onSelectEvent(null)}
                      className="flex items-center gap-1 rounded px-1 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <ArrowLeftIcon size={10} />
                      Global
                    </button>
                    <span className="truncate text-xs font-medium">
                      {selectedEvent?.title ?? "Event Chat"}
                    </span>
                  </>
                ) : (
                  <span className="text-xs font-medium">Global Chat</span>
                )}
              </div>

              {showNameInput ? (
                <form onSubmit={handleSetName} className="flex flex-col gap-2 p-3">
                  <p className="text-xs text-muted-foreground">
                    Choose a display name:
                  </p>
                  <input
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="Anonymous"
                    className="rounded-md border bg-muted/50 px-2.5 py-1.5 text-xs outline-none"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={!authorName.trim()}
                    className="rounded-md bg-foreground px-3 py-1.5 text-xs text-background disabled:opacity-30"
                  >
                    Set name
                  </button>
                </form>
              ) : (
                <>
                  <ScrollArea className="flex-1 overflow-hidden">
                    <div ref={scrollRef} className="flex flex-col">
                      {messageList.length === 0 ? (
                        <p className="px-3 py-8 text-center text-xs text-muted-foreground">
                          No messages yet
                        </p>
                      ) : (
                        messageList.map((msg) => (
                          <ChatMessageItem key={msg.id} message={msg} />
                        ))
                      )}
                    </div>
                  </ScrollArea>
                  <ChatInput onSend={handleSend} disabled={send.isPending} />
                </>
              )}
            </>
          )}
        </div>
      )}
    </MapControlContainer>
  )
}
