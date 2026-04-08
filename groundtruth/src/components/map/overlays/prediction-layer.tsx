"use client"

import { MapMarker, MapPane, MapTooltip } from "@/components/ui/map"
import type { PredictionMarket } from "@/hooks/feeds/use-prediction-markets"

const PANE_NAME = "overlay-predictions"
const PANE_Z_INDEX = 555

function probColor(p: number): string {
  if (p >= 0.7) return "rgba(34,197,94,0.9)"  // green
  if (p >= 0.3) return "rgba(234,179,8,0.9)"  // yellow
  return "rgba(239,68,68,0.9)"                  // red
}

function formatVolume(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`
  return `$${v.toFixed(0)}`
}

function ProbabilityDisc({ probability }: { probability: number }) {
  const pct = Math.round(probability * 100)
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 28,
        height: 28,
        borderRadius: 9999,
        background: probColor(probability),
        border: "2px solid rgba(255,255,255,0.8)",
        fontSize: 10,
        fontWeight: 700,
        color: "#fff",
        lineHeight: 1,
        textShadow: "0 1px 2px rgba(0,0,0,0.3)",
      }}
    >
      {pct}%
    </div>
  )
}

export function PredictionLayer({
  data,
}: {
  data: PredictionMarket[] | undefined
}) {
  if (!data?.length) return null

  return (
    <MapPane name={PANE_NAME} style={{ zIndex: PANE_Z_INDEX }}>
      {data.map((market) => (
        <MapMarker
          key={market.id}
          position={[market.lat, market.lng]}
          icon={<ProbabilityDisc probability={market.probability} />}
          iconAnchor={[14, 14]}
          pane={PANE_NAME}
        >
          <MapTooltip side="top" sideOffset={12}>
            <div style={{ maxWidth: 240 }}>
              <div style={{ fontWeight: 600, fontSize: 11, marginBottom: 2 }}>
                {market.title}
              </div>
              <div style={{ fontSize: 10, opacity: 0.8 }}>
                {Math.round(market.probability * 100)}% Yes
                {" · "}
                {formatVolume(market.volume)} volume
              </div>
            </div>
          </MapTooltip>
        </MapMarker>
      ))}
    </MapPane>
  )
}
