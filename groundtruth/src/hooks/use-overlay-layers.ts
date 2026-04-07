"use client"

import { useCallback, useMemo } from "react"
import { useQueryState, parseAsArrayOf, parseAsStringLiteral } from "nuqs"
import { LAYER_IDS, type LayerId } from "@/lib/feeds/types"

/**
 * URL-backed state for the overlay layer toggles.
 * `?layers=usgs,gdacs,nhc` — empty array (default) means no overlays active.
 * Independent of the existing `?categories=` event filter.
 */
export function useOverlayLayers() {
  const [active, setActive] = useQueryState(
    "layers",
    parseAsArrayOf(parseAsStringLiteral(LAYER_IDS), ",").withDefault([])
  )

  const activeSet = useMemo(() => new Set(active), [active])

  const isActive = useCallback(
    (id: LayerId) => activeSet.has(id),
    [activeSet]
  )

  const toggle = useCallback(
    (id: LayerId) => {
      setActive(
        activeSet.has(id)
          ? active.filter((x) => x !== id)
          : [...active, id]
      )
    },
    [active, activeSet, setActive]
  )

  const setPreset = useCallback(
    (ids: readonly LayerId[]) => {
      setActive([...ids])
    },
    [setActive]
  )

  const clear = useCallback(() => {
    setActive([])
  }, [setActive])

  return {
    active,
    activeSet,
    isActive,
    toggle,
    setPreset,
    clear,
  }
}
