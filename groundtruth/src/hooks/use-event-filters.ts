"use client"

import { useMemo, useCallback } from "react"
import { useQueryState, useQueryStates, parseAsString, parseAsArrayOf, parseAsStringLiteral, parseAsBoolean } from "nuqs"
import { EVENT_CATEGORIES } from "@/lib/event-categories"
import { EVENT_CATEGORY_VALUES, SEVERITY_LEVEL_VALUES, type EventCategory, type SeverityLevel, type WorldEvent } from "@/lib/orpc-types"

const allCategoryIds = EVENT_CATEGORIES.map((c) => c.id)

export function useEventFilters(events: WorldEvent[]) {
  const [searchQuery, setSearchQuery] = useQueryState(
    "q",
    parseAsString.withDefault("")
  )

  const [filterParams, setFilterParams] = useQueryStates({
    categories: parseAsArrayOf(parseAsStringLiteral(EVENT_CATEGORY_VALUES), ","),
    severity: parseAsArrayOf(parseAsStringLiteral(SEVERITY_LEVEL_VALUES), ","),
    verified: parseAsBoolean,
  })

  // null = all selected (clean URL)
  const activeCategories = useMemo(() => {
    if (!filterParams.categories) return new Set<EventCategory>(allCategoryIds)
    return new Set(filterParams.categories)
  }, [filterParams.categories])

  const activeSeverities = useMemo(() => {
    if (!filterParams.severity) return new Set<SeverityLevel>(SEVERITY_LEVEL_VALUES)
    return new Set(filterParams.severity)
  }, [filterParams.severity])

  const verifiedOnly = filterParams.verified ?? false

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

  const toggleVerified = useCallback(() => {
    setFilterParams({ verified: verifiedOnly ? null : true })
  }, [verifiedOnly, setFilterParams])

  const filteredEvents = useMemo(() => {
    const query = searchQuery.toLowerCase()
    return events.filter((event) => {
      if (!activeCategories.has(event.category)) return false
      if (!activeSeverities.has(event.severity)) return false
      if (verifiedOnly && !event.worldIdVerified) return false
      if (
        query &&
        !event.title.toLowerCase().includes(query) &&
        !event.location.toLowerCase().includes(query)
      ) {
        return false
      }
      return true
    })
  }, [events, activeCategories, activeSeverities, verifiedOnly, searchQuery])

  const eventsByCategory = useMemo(() => {
    const grouped = new Map<EventCategory, WorldEvent[]>()
    for (const event of filteredEvents) {
      const list = grouped.get(event.category) ?? []
      list.push(event)
      grouped.set(event.category, list)
    }
    return grouped
  }, [filteredEvents])

  const clearFilters = useCallback(() => {
    setSearchQuery("")
    setFilterParams({ categories: null, severity: null, verified: null })
  }, [setSearchQuery, setFilterParams])

  return {
    activeCategories,
    activeSeverities,
    verifiedOnly,
    searchQuery,
    filteredEvents,
    eventsByCategory,
    toggleCategory,
    toggleSeverity,
    toggleVerified,
    setSearchQuery,
    clearFilters,
  }
}
