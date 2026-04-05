"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useDisputeEvent } from "@/hooks/use-dispute-event"
import { DISPUTE_REASONS, type DisputeReason } from "@/server/db/schema/event/event.db"
import type { WorldEventId } from "@/lib/typeid"
import { AlertTriangleIcon } from "lucide-react"

const REASON_LABELS: Record<DisputeReason, { label: string; description: string }> = {
  inaccurate: { label: "Inaccurate", description: "Facts are wrong or outdated" },
  misleading: { label: "Misleading", description: "Intentionally misleading framing" },
  fabricated: { label: "Fabricated", description: "Event did not happen" },
}

export function DisputeModal({
  eventId,
  agentId,
  category,
  children,
}: {
  eventId: WorldEventId
  agentId: string
  category: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<DisputeReason>("inaccurate")
  const [justification, setJustification] = useState("")
  const dispute = useDisputeEvent()

  async function handleSubmit() {
    await dispute.mutateAsync({
      eventId,
      agentId,
      reason,
      justification,
      category,
    })
    setOpen(false)
    setJustification("")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dispute Event</DialogTitle>
          <DialogDescription>
            Submit an on-chain dispute via ERC-8004 Reputation Registry.
            This will affect the agent&apos;s reputation score.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Reason
            </label>
            <div className="flex flex-col gap-1.5">
              {DISPUTE_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`flex items-start gap-2 rounded-md border p-2 text-left text-xs transition-colors ${
                    reason === r
                      ? "border-red-500/50 bg-red-500/5"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div
                    className={`mt-0.5 h-3 w-3 shrink-0 rounded-full border ${
                      reason === r
                        ? "border-red-500 bg-red-500"
                        : "border-muted-foreground/30"
                    }`}
                  />
                  <div>
                    <div className="font-medium">{REASON_LABELS[r].label}</div>
                    <div className="text-muted-foreground">
                      {REASON_LABELS[r].description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Justification (optional)
            </label>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Why is this event inaccurate?"
              className="h-20 w-full resize-none rounded-md border bg-transparent px-2.5 py-1.5 text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleSubmit}
            disabled={dispute.isPending}
          >
            <AlertTriangleIcon size={12} className="mr-1" />
            {dispute.isPending ? "Signing TX..." : "Submit Dispute"}
          </Button>
        </DialogFooter>

        {dispute.isError && (
          <p className="text-xs text-red-500">
            {dispute.error?.message ?? "Failed to submit dispute"}
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
