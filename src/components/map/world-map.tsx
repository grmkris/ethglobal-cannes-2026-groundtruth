"use client"

import { useState, useCallback, useEffect } from "react"
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
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [clickedCoords, setClickedCoords] = useState<[number, number] | null>(null)
  const [selectedEventId, setSelectedEventId] = useState<WorldEventId | null>(null)
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("events")
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

  function handleMapClick(lat: number, lng: number) {
    setClickedCoords([lat, lng])
    setCreateModalOpen(true)
  }

  const handleOpenChat = useCallback((eventId: string) => {
    setSelectedEventId(eventId as WorldEventId)
    setSidebarTab("chat")
    setSidebarCollapsed(false)
  }, [])

  const handleFlyTo = useCallback((coordinates: [number, number]) => {
    setFlyToTarget([...coordinates])
  }, [])

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
          selectedEventId={selectedEventId}
          activeTab={sidebarTab}
          collapsed={sidebarCollapsed}
          onToggleCategory={toggleCategory}
          onSearchChange={setSearchQuery}
          onSelectEvent={setSelectedEventId}
          onTabChange={setSidebarTab}
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
