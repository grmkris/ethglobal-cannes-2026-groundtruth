"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { AgentLeaderboard } from "@/components/agent-leaderboard"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { usePaymentStats } from "@/hooks/use-payment-stats"
import { getCategoryConfig } from "@/lib/event-categories"
import type { EventCategory } from "@/lib/event-constants"
import { cn } from "@/lib/utils"
import { MapIcon } from "lucide-react"

function timeAgo(date: Date | string): string {
  const ms = typeof date === "string" ? new Date(date).getTime() : date.getTime()
  const seconds = Math.floor((Date.now() - ms) / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

export default function StatisticsPage() {
  const { data: stats } = usePaymentStats()
  const [activeTab, setActiveTab] = useState<"agents" | "payments">("agents")
  const [flash, setFlash] = useState(false)
  const prevRevenue = useRef(stats?.totalRevenueUsd)

  useEffect(() => {
    if (!stats) return
    if (prevRevenue.current !== stats.totalRevenueUsd) {
      setFlash(true)
      const t = setTimeout(() => setFlash(false), 600)
      prevRevenue.current = stats.totalRevenueUsd
      return () => clearTimeout(t)
    }
  }, [stats?.totalRevenueUsd])

  const totalRev = parseFloat(stats?.totalRevenueUsd ?? "0") || 1
  const categoriesWithRevenue = (stats?.revenueByCategory ?? [])
    .filter((r) => parseFloat(r.totalUsd) > 0)
    .sort((a, b) => parseFloat(b.totalUsd) - parseFloat(a.totalUsd))

  return (
    <div className="min-h-svh overflow-auto">
      {/* Top nav */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background/90 px-4 py-2 backdrop-blur-md">
        <Link
          href="/"
          className="flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
        >
          <MapIcon size={12} />
          Map
        </Link>
        <h1 className="text-sm font-semibold">Statistics</h1>
        <div className="ml-auto flex items-center gap-2 text-[10px] text-muted-foreground/50">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
          </span>
          x402 Arc
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
        {/* Stats cards */}
        {stats && (
          <div className="flex gap-3">
            <div className="flex-1 rounded-lg border bg-card/50 px-4 py-3">
              <div
                className={cn(
                  "text-lg font-bold text-emerald-500 transition-all duration-500",
                  flash && "scale-105 text-emerald-400 brightness-125"
                )}
              >
                ${parseFloat(stats.totalRevenueUsd).toFixed(4)}
              </div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/50">
                Total Revenue
              </div>
            </div>
            <div className="flex-1 rounded-lg border bg-card/50 px-4 py-3">
              <div className="text-lg font-bold">{stats.totalTransactions}</div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/50">
                Transactions
              </div>
            </div>
            <div className="flex-1 rounded-lg border bg-card/50 px-4 py-3">
              <div className="text-lg font-bold text-violet-500">
                {new Set(stats.recentPayments.map((p) => p.payerAddress)).size}
              </div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/50">
                Active Agents
              </div>
            </div>
          </div>
        )}

        {/* Category breakdown */}
        {categoriesWithRevenue.length > 0 && (
          <div className="space-y-2 rounded-lg border bg-card/50 px-4 py-3">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/50">
              Revenue by Category
            </div>
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted/50">
              {categoriesWithRevenue.map((r) => {
                const config = r.category
                  ? getCategoryConfig(r.category as EventCategory)
                  : null
                const pct = (parseFloat(r.totalUsd) / totalRev) * 100
                return (
                  <Tooltip key={r.category ?? "unknown"}>
                    <TooltipTrigger
                      render={
                        <div
                          className="h-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: config?.markerColor ?? "#6b7280",
                            minWidth: pct > 0 ? "2px" : 0,
                          }}
                        />
                      }
                    />
                    <TooltipContent className="font-mono text-[10px]">
                      {config?.emoji} {config?.label ?? "Unknown"}: $
                      {parseFloat(r.totalUsd).toFixed(4)} ({r.transactions} txns)
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
            <div className="flex flex-wrap gap-1">
              {categoriesWithRevenue.map((r) => {
                const config = r.category
                  ? getCategoryConfig(r.category as EventCategory)
                  : null
                return (
                  <span
                    key={r.category ?? "unknown"}
                    className={cn(
                      "inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[9px] font-medium",
                      config?.color ?? "border-border text-muted-foreground"
                    )}
                  >
                    {config?.emoji} ${parseFloat(r.totalUsd).toFixed(3)}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            if (v === "agents" || v === "payments") setActiveTab(v)
          }}
        >
          <TabsList variant="line" className="w-full border-b px-0">
            <TabsTrigger value="agents" className="flex-1 text-xs">
              Agents
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex-1 text-xs">
              Recent Payments
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Tab content */}
        {activeTab === "agents" && <AgentLeaderboard />}

        {activeTab === "payments" && stats && (
          <div className="divide-y rounded-lg border bg-background/50">
            {stats.recentPayments.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No payments yet
              </div>
            ) : (
              stats.recentPayments.map((p, i) => {
                const config = p.category
                  ? getCategoryConfig(p.category as EventCategory)
                  : null
                const addr = `${p.payerAddress.slice(0, 6)}...${p.payerAddress.slice(-4)}`
                return (
                  <div
                    key={p.id}
                    className="animate-in fade-in slide-in-from-left-1 flex items-center gap-2 px-4 py-2.5 text-[11px] text-muted-foreground"
                    style={{
                      animationDelay: `${i * 30}ms`,
                      animationFillMode: "backwards",
                    }}
                  >
                    <span className="font-medium text-foreground/70">
                      {addr}
                    </span>
                    <span className="text-muted-foreground/40">paid</span>
                    <span className="font-medium text-emerald-500">
                      ${parseFloat(p.amountUsd).toFixed(4)}
                    </span>
                    {config && (
                      <>
                        <span className="text-muted-foreground/40">for</span>
                        <span style={{ color: config.markerColor }}>
                          {config.emoji} {config.label.toLowerCase()}
                        </span>
                      </>
                    )}
                    <span className="ml-auto text-[10px] text-muted-foreground/40">
                      {timeAgo(p.createdAt)}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </div>
  )
}
