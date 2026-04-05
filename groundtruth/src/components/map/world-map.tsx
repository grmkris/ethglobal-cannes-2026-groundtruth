"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useQueryState, parseAsStringLiteral } from "nuqs"
import { parseAsWorldEventId } from "@/lib/nuqs-parsers"
import {
  Map,
  MapControlContainer,
  MapFullscreenControl,
  MapLayers,
  MapLayersControl,
  MapLocateControl,
  MapTileLayer,
  MapZoomControl,
} from "@/components/ui/map"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { EVENT_CATEGORIES } from "@/lib/event-categories"
import type { WorldEventId } from "@/lib/typeid"
import { useEventFilters } from "@/hooks/use-event-filters"
import { useEvents } from "@/hooks/use-events"
import type { LatLngExpression } from "leaflet"
import { useMap } from "react-leaflet"
import { CrosshairIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { CreateEventModal } from "./create-event-modal"
import { EventDetailPanel } from "./event-detail-panel"
import { EventMarkers } from "./event-markers"
import { MapClickHandler } from "./map-click-handler"
import { MapSidebar, type SidebarTab } from "./map-sidebar"
import { UserControls } from "@/components/user-controls"

const WORLD_CENTER = [20, 0] as const satisfies LatLngExpression

// Legitimate effect — syncs with external system (Leaflet map)
function MapFlyTo({ target }: { target: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (target) {
      map.flyTo(target, Math.max(map.getZoom(), 14), { duration: 1 })
    }
  }, [target, map])
  return null
}

export function WorldMap() {
  const { data: events = [], isLoading } = useEvents()

  // URL-backed state (shareable)
  const [selectedEventId, setSelectedEventId] = useQueryState("event", parseAsWorldEventId)
  const [sidebarTab, setSidebarTab] = useQueryState(
    "tab",
    parseAsStringLiteral(["events", "chat"] as const).withDefault("events")
  )

  // Local UI state (ephemeral)
  const [reportMode, setReportMode] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [clickedCoords, setClickedCoords] = useState<[number, number] | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [flyToTarget, setFlyToTarget] = useState<[number, number] | null>(null)

  // One-time URL deep-link fly guard
  const initialFlyDone = useRef(false)

  const {
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
  } = useEventFilters(events)

  // Legitimate effect: sync with external system on initial URL deep-link
  // Only fires once when events first load and URL has a selected event
  useEffect(() => {
    if (!initialFlyDone.current && selectedEventId && events.length > 0) {
      const event = events.find((e) => e.id === selectedEventId)
      if (event) {
        setFlyToTarget([...event.coordinates])
        initialFlyDone.current = true
      }
    }
  }, [selectedEventId, events])

  // Compute selectedEvent from full events array (not filtered)
  const selectedEvent = selectedEventId
    ? events.find((e) => e.id === selectedEventId) ?? null
    : null

  function handleMapClick(lat: number, lng: number) {
    if (!reportMode) return
    setClickedCoords([lat, lng])
    setCreateModalOpen(true)
    setReportMode(false)
  }

  const handleOpenChat = useCallback(
    (eventId: WorldEventId) => {
      setSelectedEventId(eventId)
      setSidebarCollapsed(false)
      const event = events.find((e) => e.id === eventId)
      if (event) setFlyToTarget([...event.coordinates])
    },
    [setSelectedEventId, events]
  )

  const handleFlyTo = useCallback((coordinates: [number, number]) => {
    setFlyToTarget([...coordinates])
  }, [])

  // Event handlers fold in sidebar expansion + flyTo (no effects needed)
  const handleSelectEvent = useCallback(
    (eventId: WorldEventId | null) => {
      setSelectedEventId(eventId)
      if (eventId) {
        setSidebarCollapsed(false)
        const event = events.find((e) => e.id === eventId)
        if (event) setFlyToTarget([...event.coordinates])
      }
    },
    [setSelectedEventId, events]
  )

  const handleCloseDetail = useCallback(() => {
    setSelectedEventId(null)
  }, [setSelectedEventId])

  const handleTabChange = useCallback(
    (tab: SidebarTab) => {
      setSidebarTab(tab)
      if (tab === "chat") setSidebarCollapsed(false)
    },
    [setSidebarTab]
  )

  // Shift right-side controls when detail panel is open (sm:w-80 = 320px + gap)
  const rCtrl = selectedEvent ? "right-2 sm:right-[21.5rem]" : "right-2"

  if (isLoading) {
    return (
      <div className="flex h-svh w-svw bg-background">
        <div className="hidden w-80 border-r border-border/50 p-3 sm:block">
          <div className="space-y-3">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-10 w-full rounded-3xl" />
            <Separator />
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-16 rounded-full" />
              ))}
            </div>
            <div className="space-y-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-14 w-full"
                  style={{ animationDelay: `${i * 75}ms` }}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center bg-muted/20">
          <div className="flex flex-col items-center gap-3">
            <Spinner className="size-5" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Initializing
            </span>
          </div>
        </div>
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
        className={cn("h-full w-full", reportMode && "cursor-crosshair")}
      >
        <MapClickHandler onClick={handleMapClick} enabled={reportMode} />
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
            onSelectEvent={handleSelectEvent}
          />
          <MapLayersControl position={`bottom-2 ${rCtrl}`} />
        </MapLayers>

        {selectedEvent && (
          <EventDetailPanel
            key={selectedEvent.id}
            event={selectedEvent}
            onClose={handleCloseDetail}
          />
        )}

        <MapZoomControl position={`bottom-14 ${rCtrl}`} />
        <MapFullscreenControl position={`bottom-24 ${rCtrl}`} />
        <MapLocateControl position={`bottom-34 ${rCtrl}`} />

        {/* Report mode FAB */}
        <MapControlContainer className={`bottom-44 ${rCtrl}`}>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  size="icon"
                  variant={reportMode ? "default" : "outline"}
                  onClick={() => setReportMode((p) => !p)}
                  aria-label={reportMode ? "Cancel report" : "Report event"}
                  className={cn(reportMode && "ring-2 ring-primary/50 animate-pulse")}
                />
              }
            >
              <CrosshairIcon size={18} />
            </TooltipTrigger>
            <TooltipContent side="left">
              {reportMode ? "Cancel report" : "Report event"}
            </TooltipContent>
          </Tooltip>
        </MapControlContainer>

        <UserControls />

        <MapSidebar
          filteredEvents={filteredEvents}
          eventCount={filteredEvents.length}
          activeCategories={activeCategories}
          activeSeverities={activeSeverities}
          verifiedOnly={verifiedOnly}
          searchQuery={searchQuery}
          selectedEventId={selectedEventId}
          selectedEvent={selectedEvent}
          activeTab={sidebarTab}
          collapsed={sidebarCollapsed}
          onToggleCategory={toggleCategory}
          onToggleSeverity={toggleSeverity}
          onToggleVerified={toggleVerified}
          onSearchChange={setSearchQuery}
          onClearFilters={clearFilters}
          onSelectEvent={handleSelectEvent}
          onTabChange={handleTabChange}
          onCollapsedChange={setSidebarCollapsed}
          onFlyTo={handleFlyTo}
        />
      </Map>

      {/* Report mode mobile banner */}
      {reportMode && (
        <div className="fixed inset-x-0 bottom-0 z-[1001] flex items-center justify-between bg-foreground px-4 py-3 text-background sm:hidden">
          <span className="text-xs font-medium">Tap map to place report</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setReportMode(false)}
            className="text-background hover:text-background/80"
          >
            Cancel
          </Button>
        </div>
      )}

      <CreateEventModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        coordinates={clickedCoords}
      />
    </div>
  )
}
