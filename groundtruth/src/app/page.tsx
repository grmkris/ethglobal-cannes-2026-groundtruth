"use client"

import dynamic from "next/dynamic"
import { ErrorBoundary } from "@/components/error-boundary"
import { Spinner } from "@/components/ui/spinner"

// Leaflet accesses `window` at import time — must skip SSR entirely.
const WorldMap = dynamic(() => import("@/components/map/world-map").then((m) => m.WorldMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-svh w-svw flex-col items-center justify-center gap-3 bg-background">
      <Spinner className="size-5" />
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Initializing
      </span>
    </div>
  ),
})

export default function Page() {
  return (
    <ErrorBoundary>
      <WorldMap />
    </ErrorBoundary>
  )
}
