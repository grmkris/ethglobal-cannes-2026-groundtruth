import { Suspense } from "react"
import { WorldMap } from "@/components/map/world-map"

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex h-svh w-svw items-center justify-center bg-background">
          <p className="animate-pulse text-sm font-medium">
            Monitoring the situation...
          </p>
        </div>
      }
    >
      <WorldMap />
    </Suspense>
  )
}
