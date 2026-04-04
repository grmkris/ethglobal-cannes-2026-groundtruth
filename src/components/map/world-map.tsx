"use client"

import { useState, useCallback, useEffect } from "react"
import { useQueryState, parseAsString, parseAsStringLiteral } from "nuqs"
import {
  Map,
  MapFullscreenControl,
  MapLayers,
  MapLayersControl,
  MapLocateControl,
  MapTileLayer,
  MapZoomControl,
} from "@/components/ui/map"
import { EVENT_CATEGORIES } from "@/lib/event-categories"
import type { WorldEventId } from "@/lib/typeid"
import { useEventFilters } from "@/hooks/use-event-filters"
import { useEvents } from "@/hooks/use-events"
import type { LatLngExpression } from "leaflet"
import { useMap } from "react-leaflet"
import { CreateEventModal } from "./create-event-modal"
import { EventMarkers } from "./event-markers"
import { MapClickHandler } from "./map-click-handler"
import { MapSidebar, type SidebarTab } from "./map-sidebar"

const WORLD_CENTER = [20, 0] as const satisfies LatLngExpression

function MapFlyTo({ target }: { target: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (target) {
      map.flyTo(target, Math.max(map.getZoom(), 10), { duration: 1 })
    }
  }, [target, map])
  return null
}

export function WorldMap() {
  const { data: events = [], isLoading } = useEvents()

  // URL-backed state (shareable)
  const [selectedEventId, setSelectedEventId] = useQueryState("event", parseAsString)
  const [sidebarTab, setSidebarTab] = useQueryState(
    "tab",
    parseAsStringLiteral(["events", "chat"] as const).withDefault("events")
  )

  // Local UI state (ephemeral)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [clickedCoords, setClickedCoords] = useState<[number, number] | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [flyToTarget, setFlyToTarget] = useState<[number, number] | null>(null)

  const {
    activeCategories,
    searchQuery,
    filteredEvents,
    eventsByCategory,
    toggleCategory,
    setSearchQuery,
  } = useEventFilters(events)

  // Auto-flyTo when event is selected (including from shared URL)
  useEffect(() => {
    if (selectedEventId && events.length > 0) {
      const event = events.find((e) => e.id === selectedEventId)
      if (event) setFlyToTarget([...event.coordinates])
    }
  }, [selectedEventId, events])

  // Auto-expand sidebar when event or chat tab is active
  useEffect(() => {
    if (selectedEventId || sidebarTab === "chat") {
      setSidebarCollapsed(false)
    }
  }, [selectedEventId, sidebarTab])

  function handleMapClick(lat: number, lng: number) {
    setClickedCoords([lat, lng])
    setCreateModalOpen(true)
  }

  const handleOpenChat = useCallback(
    (eventId: string) => {
      setSelectedEventId(eventId)
      setSidebarTab("chat")
      setSidebarCollapsed(false)
    },
    [setSelectedEventId, setSidebarTab]
  )

  const handleFlyTo = useCallback((coordinates: [number, number]) => {
    setFlyToTarget([...coordinates])
  }, [])

  const handleSelectEvent = useCallback(
    (eventId: WorldEventId | null) => {
      setSelectedEventId(eventId)
    },
    [setSelectedEventId]
  )

  const handleTabChange = useCallback(
    (tab: SidebarTab) => {
      setSidebarTab(tab)
    },
    [setSidebarTab]
  )

  if (isLoading) {
    return (
      <div className="flex h-svh w-svw items-center justify-center bg-background">
        <p className="animate-pulse text-sm font-medium">
          Monitoring the situation...
        </p>
      </div>
    )
  }

  return (
    <div className="h-svh w-svw">
      <Map
        center={WORLD_CENTER}
        zoom={3}
        minZoom={2}
        maxZoom={18}
        className="h-full w-full"
      >
        <MapClickHandler onClick={handleMapClick} />
        <MapFlyTo target={flyToTarget} />

        <MapLayers
          defaultLayerGroups={EVENT_CATEGORIES.map((c) => c.label)}
        >
          <MapTileLayer name="Default" />
          <MapTileLayer
            name="Satellite"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="Tiles &copy; Esri"
          />
          <EventMarkers
            eventsByCategory={eventsByCategory}
            onOpenChat={handleOpenChat}
          />
          <MapLayersControl position="bottom-2 right-2" />
        </MapLayers>

        <MapZoomControl position="bottom-14 right-2" />
        <MapFullscreenControl position="bottom-24 right-2" />
        <MapLocateControl position="bottom-34 right-2" />

        <MapSidebar
          filteredEvents={filteredEvents}
          eventCount={filteredEvents.length}
          activeCategories={activeCategories}
          searchQuery={searchQuery}
          selectedEventId={(selectedEventId as WorldEventId) ?? null}
          activeTab={sidebarTab}
          collapsed={sidebarCollapsed}
          onToggleCategory={toggleCategory}
          onSearchChange={setSearchQuery}
          onSelectEvent={handleSelectEvent}
          onTabChange={handleTabChange}
          onCollapsedChange={setSidebarCollapsed}
          onFlyTo={handleFlyTo}
        />
      </Map>

      <CreateEventModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        coordinates={clickedCoords}
      />
    </div>
  )
}
