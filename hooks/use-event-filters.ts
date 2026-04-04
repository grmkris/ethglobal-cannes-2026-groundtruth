"use client"

import { useMemo, useState, useCallback } from "react"
import { MOCK_EVENTS } from "@/lib/mock-events"
import { EVENT_CATEGORIES } from "@/lib/event-categories"
import { SEVERITY_LEVELS, type EventCategory, type SeverityLevel, type WorldEvent } from "@/lib/types"

export function useEventFilters() {
  const [activeCategories, setActiveCategories] = useState<Set<EventCategory>>(
    () => new Set(EVENT_CATEGORIES.map((c) => c.id))
  )
  const [activeSeverities, setActiveSeverities] = useState<Set<SeverityLevel>>(
    () => new Set<SeverityLevel>(SEVERITY_LEVELS)
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
    return MOCK_EVENTS.filter((event) => {
      if (!activeCategories.has(event.category)) return false
      if (!activeSeverities.has(event.severity)) return false
      if (query && !event.title.toLowerCase().includes(query) && !event.location.toLowerCase().includes(query)) {
        return false
      }
      return true
    })
  }, [activeCategories, activeSeverities, searchQuery])

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
