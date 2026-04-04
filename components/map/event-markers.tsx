"use client"

import {
  MapLayerGroup,
  MapMarker,
  MapMarkerClusterGroup,
  MapPopup,
  MapTooltip,
} from "@/components/ui/map"
import { EVENT_CATEGORIES } from "@/lib/event-categories"
import type { EventCategory, WorldEvent } from "@/lib/types"
import { EventMarkerIcon } from "./event-marker-icon"
import { EventPopupContent } from "./event-popup"

export function EventMarkers({
  eventsByCategory,
}: {
  eventsByCategory: Map<EventCategory, WorldEvent[]>
}) {
  return (
    <>
      {EVENT_CATEGORIES.map((category) => {
        const events = eventsByCategory.get(category.id)
        if (!events?.length) return null

        return (
          <MapLayerGroup key={category.id} name={category.label}>
            <MapMarkerClusterGroup
              icon={(count) => (
                <div
                  className="flex size-10 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white shadow-lg dark:border-neutral-800"
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
                  icon={
                    <EventMarkerIcon
                      category={event.category}
                      severity={event.severity}
                    />
                  }
                >
                  <MapPopup className="w-auto border-0 p-0 shadow-none bg-transparent">
                    <EventPopupContent event={event} />
                  </MapPopup>
                  <MapTooltip side="top" sideOffset={20}>
                    {event.title}
                  </MapTooltip>
                </MapMarker>
              ))}
            </MapMarkerClusterGroup>
          </MapLayerGroup>
        )
      })}
    </>
  )
}
