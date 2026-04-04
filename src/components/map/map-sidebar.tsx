"use client"

import { MapControlContainer } from "@/components/ui/map"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getCategoryConfig } from "@/lib/event-categories"
import type { EventCategory, SeverityLevel, WorldEvent } from "@/lib/orpc-types"
import { cn } from "@/lib/utils"
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon } from "lucide-react"
import { useState } from "react"
import { CategoryFilter } from "./category-filter"

const SEVERITY_DOT: Record<SeverityLevel, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
}

function EventListItem({ event }: { event: WorldEvent }) {
  const config = getCategoryConfig(event.category)
  const time = new Date(event.timestamp).toLocaleString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <div className="border-b border-border/50 px-3 py-2.5 transition-colors hover:bg-muted/50">
      <div className="mb-1 flex items-center gap-1.5">
        <span className={cn("size-1.5 rounded-full", SEVERITY_DOT[event.severity])} />
        <span className="text-[10px] text-muted-foreground">{config.emoji} {config.label}</span>
        <span className="ml-auto text-[10px] text-muted-foreground">{time}</span>
      </div>
      <h4 className="text-xs font-medium leading-snug">{event.title}</h4>
      <p className="mt-0.5 text-[10px] text-muted-foreground">{event.location}</p>
    </div>
  )
}

export function MapSidebar({
  filteredEvents,
  activeCategories,
  searchQuery,
  onToggleCategory,
  onSearchChange,
}: {
  filteredEvents: WorldEvent[]
  activeCategories: Set<EventCategory>
  searchQuery: string
  onToggleCategory: (category: EventCategory) => void
  onSearchChange: (query: string) => void
}) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <MapControlContainer
      className={cn(
        "absolute top-2 left-2 z-[1000] flex transition-all duration-300",
        collapsed ? "w-10" : "w-80"
      )}
    >
      {collapsed ? (
        <button
          onClick={() => setCollapsed(false)}
          className="flex size-10 items-center justify-center rounded-lg border bg-background/90 shadow-lg backdrop-blur-md hover:bg-muted"
        >
          <ChevronRightIcon size={16} />
        </button>
      ) : (
        <div className="flex h-[calc(100vh-1rem)] max-h-[calc(100vh-1rem)] flex-col rounded-lg border bg-background/90 shadow-lg backdrop-blur-md">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-3 py-2.5">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">
                Monitoring the Situation
              </h2>
              <p className="text-[10px] text-muted-foreground">
                {filteredEvents.length} active events
              </p>
            </div>
            <button
              onClick={() => setCollapsed(true)}
              className="flex size-6 items-center justify-center rounded-md hover:bg-muted"
            >
              <ChevronLeftIcon size={14} />
            </button>
          </div>

          {/* Search */}
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

          {/* Category Filters */}
          <div className="border-b px-3 py-2">
            <CategoryFilter
              activeCategories={activeCategories}
              onToggle={onToggleCategory}
            />
          </div>

          {/* Event List */}
          <ScrollArea className="flex-1 overflow-hidden">
            <div>
              {filteredEvents.length === 0 ? (
                <div className="px-3 py-8 text-center text-xs text-muted-foreground">
                  No events match filters
                </div>
              ) : (
                filteredEvents.map((event) => (
                  <EventListItem key={event.id} event={event} />
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </MapControlContainer>
  )
}
