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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FileUpload } from "@/components/ui/file-upload"
import { useCreateEvent } from "@/hooks/use-create-event"
import { EVENT_CATEGORIES } from "@/lib/event-categories"
import {
  EVENT_CATEGORY_VALUES,
  SEVERITY_LEVEL_VALUES,
  type EventCategory,
  type SeverityLevel,
} from "@/lib/orpc-types"
import { XIcon } from "lucide-react"

export function CreateEventModal({
  open,
  onOpenChange,
  coordinates,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  coordinates: [number, number] | null
}) {
  // key pattern: inner component remounts on new coordinates → fresh state
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {coordinates && (
          <CreateEventFormInner
            key={`${coordinates[0]},${coordinates[1]}`}
            coordinates={coordinates}
            onOpenChange={onOpenChange}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function CreateEventFormInner({
  coordinates,
  onOpenChange,
}: {
  coordinates: [number, number]
  onOpenChange: (open: boolean) => void
}) {
  const createEvent = useCreateEvent()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState<EventCategory>("politics")
  const [severity, setSeverity] = useState<SeverityLevel>("medium")
  const [location, setLocation] = useState("")
  const [source, setSource] = useState("")
  const [imageUrls, setImageUrls] = useState<string[]>([])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    createEvent.mutate(
      {
        title: title.trim(),
        description: description.trim(),
        category,
        severity,
        latitude: coordinates[0],
        longitude: coordinates[1],
        location: location.trim() || `${coordinates[0].toFixed(2)}, ${coordinates[1].toFixed(2)}`,
        source: source.trim() || null,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false)
        },
      }
    )
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Report Event</DialogTitle>
        <DialogDescription>
          At {coordinates[0].toFixed(4)}, {coordinates[1].toFixed(4)}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="event-title">Title</Label>
          <Input
            id="event-title"
            placeholder="Event title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="event-description">Description</Label>
          <Textarea
            id="event-description"
            placeholder="What's happening?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={3}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="event-location">Location</Label>
          <Input
            id="event-location"
            placeholder="Location name (e.g., Cannes, France)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>

        <div className="flex gap-3">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label id="category-label">Category</Label>
            <Select
              value={category}
              onValueChange={(v) => {
                setCategory(v ?? 'politics')
              }}
              aria-labelledby="category-label"
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_CATEGORIES.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.emoji} {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label id="severity-label">Severity</Label>
            <Select
              value={severity}
              onValueChange={(v) => {
                setSeverity(v ?? 'medium')
              }}
              aria-labelledby="severity-label"
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEVERITY_LEVEL_VALUES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="event-source">Source URL (optional)</Label>
          <Input
            id="event-source"
            placeholder="https://..."
            value={source}
            onChange={(e) => setSource(e.target.value)}
          />
        </div>

        {/* Image upload */}
        {imageUrls.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {imageUrls.map((url, i) => (
              <div key={url} className="group relative">
                <img
                  src={url}
                  alt={`Upload ${i + 1}`}
                  className="size-16 rounded-md border object-cover"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon-xs"
                  onClick={() => setImageUrls((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute -top-1.5 -right-1.5 size-5 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <XIcon size={10} />
                </Button>
              </div>
            ))}
          </div>
        )}
        {imageUrls.length < 5 && (
          <FileUpload
            onUpload={(url) => setImageUrls((prev) => [...prev, url])}
            disabled={createEvent.isPending}
          />
        )}

        <Button type="submit" disabled={createEvent.isPending || !title.trim() || !description.trim()}>
          {createEvent.isPending ? "Submitting..." : "Submit Event"}
        </Button>
      </form>
    </>
  )
}
