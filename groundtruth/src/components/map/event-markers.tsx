"use client"

import {
  MapLayerGroup,
  MapMarker,
  MapMarkerClusterGroup,
  MapTooltip,
} from "@/components/ui/map"
import { EVENT_CATEGORIES } from "@/lib/event-categories"
import type { EventCategory, WorldEvent } from "@/lib/orpc-types"
import type { WorldEventId } from "@/lib/typeid"
import { EventMarkerIcon } from "./event-marker-icon"

export function EventMarkers({
  eventsByCategory,
  onOpenChat,
  onSelectEvent,
}: {
  eventsByCategory: Map<EventCategory, WorldEvent[]>
  onOpenChat: (eventId: WorldEventId) => void
  onSelectEvent: (eventId: WorldEventId) => void
}) {
  return (
    <>
      {EVENT_CATEGORIES.map((category) => {
        const events = eventsByCategory.get(category.id)

        return (
          <MapLayerGroup key={category.id} name={category.label} disabled={false}>
            {!events?.length ? null : <MapMarkerClusterGroup
              icon={(count) => (
                <div
                  className="flex size-11 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white shadow-lg dark:border-neutral-800"
                  style={{ backgroundColor: category.markerColor }}
                >
                  {count}
                </div>
              )}
            >
              {events.map((event) => (
                <MapMarker
                  key={event.id}
                  position={event.coordinates}
                  iconAnchor={[22, 22]}
                  icon={
                    <EventMarkerIcon
                      category={event.category}
                      severity={event.severity}
                    />
                  }
                  eventHandlers={{
                    click: () => onSelectEvent(event.id),
                  }}
                >
                  <MapTooltip side="top" sideOffset={20}>
                    {event.title}
                  </MapTooltip>
                </MapMarker>
              ))}
            </MapMarkerClusterGroup>}
          </MapLayerGroup>
        )
      })}
    </>
  )
}
