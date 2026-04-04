"use client"

import { useMemo, useState, useCallback } from "react"
import { EVENT_CATEGORIES } from "@/lib/event-categories"
import { SEVERITY_LEVEL_VALUES, type EventCategory, type SeverityLevel, type WorldEvent } from "@/lib/orpc-types"

export function useEventFilters(events: WorldEvent[]) {
  const [activeCategories, setActiveCategories] = useState<Set<EventCategory>>(
    () => new Set(EVENT_CATEGORIES.map((c) => c.id))
  )
  const [activeSeverities, setActiveSeverities] = useState<Set<SeverityLevel>>(
    () => new Set<SeverityLevel>(SEVERITY_LEVEL_VALUES)
  )
  const [searchQuery, setSearchQuery] = useState("")

  const toggleCategory = useCallback((category: EventCategory) => {
    setActiveCategories((prev) => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }, [])

  const toggleSeverity = useCallback((severity: SeverityLevel) => {
    setActiveSeverities((prev) => {
      const next = new Set(prev)
      if (next.has(severity)) {
        next.delete(severity)
      } else {
        next.add(severity)
      }
      return next
    })
  }, [])

  const filteredEvents = useMemo(() => {
    const query = searchQuery.toLowerCase()
    return events.filter((event) => {
      if (!activeCategories.has(event.category)) return false
      if (!activeSeverities.has(event.severity)) return false
      if (query && !event.title.toLowerCase().includes(query) && !event.location.toLowerCase().includes(query)) {
        return false
      }
      return true
    })
  }, [events, activeCategories, activeSeverities, searchQuery])

  const eventsByCategory = useMemo(() => {
    const grouped = new Map<EventCategory, WorldEvent[]>()
    for (const event of filteredEvents) {
      const list = grouped.get(event.category) ?? []
      list.push(event)
      grouped.set(event.category, list)
    }
    return grouped
  }, [filteredEvents])

  return {
    activeCategories,
    activeSeverities,
    searchQuery,
    filteredEvents,
    eventsByCategory,
    toggleCategory,
    toggleSeverity,
    setSearchQuery,
  }
}
