"use client"

import { MapControlContainer } from "@/components/ui/map"
import { MoonIcon, SunIcon } from "lucide-react"
import { useTheme } from "next-themes"

export function MapHeader({ eventCount }: { eventCount: number }) {
  const { theme, setTheme } = useTheme()

  return (
    <MapControlContainer className="absolute top-2 right-2 z-[1000] flex items-center gap-2">
      <div className="flex items-center gap-2 rounded-lg border bg-background/90 px-3 py-1.5 shadow-lg backdrop-blur-md">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-red-500" />
        </span>
        <span className="text-xs font-medium">{eventCount} live</span>
      </div>
      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="flex size-8 items-center justify-center rounded-lg border bg-background/90 shadow-lg backdrop-blur-md hover:bg-muted"
      >
        {theme === "dark" ? <SunIcon size={14} /> : <MoonIcon size={14} />}
      </button>
    </MapControlContainer>
  )
}
