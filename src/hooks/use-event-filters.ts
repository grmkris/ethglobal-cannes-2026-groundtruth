"use client"

import { useMemo, useCallback } from "react"
import { useQueryState, useQueryStates, parseAsString, parseAsArrayOf } from "nuqs"
import { EVENT_CATEGORIES } from "@/lib/event-categories"
import { SEVERITY_LEVEL_VALUES, type EventCategory, type SeverityLevel, type WorldEvent } from "@/lib/orpc-types"

const allCategoryIds = EVENT_CATEGORIES.map((c) => c.id)

export function useEventFilters(events: WorldEvent[]) {
  const [searchQuery, setSearchQuery] = useQueryState(
    "q",
    parseAsString.withDefault("")
  )

  const [filterParams, setFilterParams] = useQueryStates({
    categories: parseAsArrayOf(parseAsString, ","),
    severity: parseAsArrayOf(parseAsString, ","),
  })

  // null = all selected (clean URL)
  const activeCategories = useMemo(() => {
    if (!filterParams.categories) return new Set<EventCategory>(allCategoryIds)
    return new Set<EventCategory>(filterParams.categories as EventCategory[])
  }, [filterParams.categories])

  const activeSeverities = useMemo(() => {
    if (!filterParams.severity) return new Set<SeverityLevel>(SEVERITY_LEVEL_VALUES)
    return new Set<SeverityLevel>(filterParams.severity as SeverityLevel[])
  }, [filterParams.severity])

  const toggleCategory = useCallback(
    (category: EventCategory) => {
      const current = filterParams.categories ?? [...allCategoryIds]
      const next = current.includes(category)
        ? current.filter((c) => c !== category)
        : [...current, category]
      setFilterParams({
        categories: next.length === allCategoryIds.length ? null : next,
      })
    },
    [filterParams.categories, setFilterParams]
  )

  const toggleSeverity = useCallback(
    (severity: SeverityLevel) => {
      const current = filterParams.severity ?? [...SEVERITY_LEVEL_VALUES]
      const next = current.includes(severity)
        ? current.filter((s) => s !== severity)
        : [...current, severity]
      setFilterParams({
        severity: next.length === SEVERITY_LEVEL_VALUES.length ? null : next,
      })
    },
    [filterParams.severity, setFilterParams]
  )

  const filteredEvents = useMemo(() => {
    const query = searchQuery.toLowerCase()
    return events.filter((event) => {
      if (!activeCategories.has(event.category)) return false
      if (!activeSeverities.has(event.severity)) return false
      if (
        query &&
        !event.title.toLowerCase().includes(query) &&
        !event.location.toLowerCase().includes(query)
      ) {
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
