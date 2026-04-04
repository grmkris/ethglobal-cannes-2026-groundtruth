"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useCreateEvent } from "@/hooks/use-create-event"
import { EVENT_CATEGORIES } from "@/lib/event-categories"
import type { EventCategory, SeverityLevel } from "@/lib/orpc-types"

const SEVERITY_OPTIONS: SeverityLevel[] = ["low", "medium", "high", "critical"]

export function CreateEventModal({
  open,
  onOpenChange,
  coordinates,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  coordinates: [number, number] | null
}) {
  const createEvent = useCreateEvent()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState<EventCategory>("politics")
  const [severity, setSeverity] = useState<SeverityLevel>("medium")
  const [location, setLocation] = useState("")
  const [source, setSource] = useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!coordinates) return

    createEvent.mutate(
      {
        title,
        description,
        category,
        severity,
        latitude: coordinates[0],
        longitude: coordinates[1],
        location: location || `${coordinates[0].toFixed(2)}, ${coordinates[1].toFixed(2)}`,
        source: source || null,
      },
      {
        onSuccess: () => {
          onOpenChange(false)
          setTitle("")
          setDescription("")
          setLocation("")
          setSource("")
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report Event</DialogTitle>
          <DialogDescription>
            {coordinates
              ? `At ${coordinates[0].toFixed(4)}, ${coordinates[1].toFixed(4)}`
              : "Click on the map to set location"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Event title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="rounded-md border bg-muted/50 px-3 py-2 text-sm outline-none"
          />
          <textarea
            placeholder="What's happening?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={3}
            className="rounded-md border bg-muted/50 px-3 py-2 text-sm outline-none resize-none"
          />
          <input
            type="text"
            placeholder="Location name (e.g., Cannes, France)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="rounded-md border bg-muted/50 px-3 py-2 text-sm outline-none"
          />
          <div className="flex gap-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as EventCategory)}
              className="flex-1 rounded-md border bg-muted/50 px-3 py-2 text-sm outline-none"
            >
              {EVENT_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.label}
                </option>
              ))}
            </select>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as SeverityLevel)}
              className="flex-1 rounded-md border bg-muted/50 px-3 py-2 text-sm outline-none"
            >
              {SEVERITY_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <input
            type="text"
            placeholder="Source URL (optional)"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="rounded-md border bg-muted/50 px-3 py-2 text-sm outline-none"
          />
          <Button type="submit" disabled={createEvent.isPending || !title || !description}>
            {createEvent.isPending ? "Submitting..." : "Submit Event"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
