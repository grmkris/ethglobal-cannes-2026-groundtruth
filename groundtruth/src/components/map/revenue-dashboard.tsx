"use client"

import { useEffect, useRef, useState } from "react"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { getCategoryConfig } from "@/lib/event-categories"
import type { EventCategory } from "@/lib/event-constants"
import type { PaymentStats } from "@/lib/orpc-types"
import { cn } from "@/lib/utils"
import { ActivityIcon, ChevronDownIcon, TrophyIcon } from "lucide-react"
import Link from "next/link"

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

interface RevenueDashboardProps {
  stats: PaymentStats | undefined
}

export function RevenueDashboard({ stats }: RevenueDashboardProps) {
  const [expanded, setExpanded] = useState(false)
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

  if (!stats || stats.totalTransactions === 0) return null

  const totalRev = parseFloat(stats.totalRevenueUsd) || 1
  const categoriesWithRevenue = stats.revenueByCategory
    .filter((r) => parseFloat(r.totalUsd) > 0)
    .sort((a, b) => parseFloat(b.totalUsd) - parseFloat(a.totalUsd))

  return (
    <div>
      {/* Summary row — always visible */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="group flex w-full items-center gap-2 border-b px-3 py-1.5 font-mono text-[10px] text-muted-foreground transition-colors hover:bg-muted/30"
      >
        <ActivityIcon size={10} className="shrink-0 text-emerald-500/70" />
        <span
          className={cn(
            "font-medium text-emerald-500 transition-all duration-500",
            flash && "scale-105 text-emerald-400 brightness-125"
          )}
        >
          ${parseFloat(stats.totalRevenueUsd).toFixed(4)}
        </span>
        <span className="text-muted-foreground/40">|</span>
        <span>{stats.totalTransactions} txns</span>
        <span className="ml-auto text-[9px] text-muted-foreground/30">
          x402
        </span>
        <ChevronDownIcon
          size={10}
          className={cn(
            "shrink-0 text-muted-foreground/40 transition-transform duration-200",
            expanded && "rotate-180"
          )}
        />
      </button>

      {/* Expanded panel */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-out",
          expanded ? "max-h-72 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="space-y-2 border-b px-3 py-2">
          {/* Stacked bar */}
          {categoriesWithRevenue.length > 0 && (
            <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
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
          )}

          {/* Category pills */}
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
                    config?.color ??
                      "border-border text-muted-foreground"
                  )}
                >
                  {config?.emoji} ${parseFloat(r.totalUsd).toFixed(3)}
                </span>
              )
            })}
          </div>

          {/* Recent payments */}
          {stats.recentPayments.length > 0 && (
            <>
              <div className="border-t border-border/30 pt-1.5">
                <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground/50">
                  Recent payments
                </span>
              </div>
              <div className="-mx-3 space-y-0">
                {stats.recentPayments.slice(0, 5).map((p, i) => {
                  const config = p.category
                    ? getCategoryConfig(p.category as EventCategory)
                    : null
                  const addr = `${p.payerAddress.slice(0, 6)}...${p.payerAddress.slice(-4)}`
                  return (
                    <div
                      key={p.id}
                      className="animate-in fade-in slide-in-from-left-1 flex items-center gap-1.5 px-3 py-1 text-[10px] text-muted-foreground"
                      style={{
                        animationDelay: `${i * 40}ms`,
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
                            {config.emoji}{" "}
                            {config.label.toLowerCase()}
                          </span>
                        </>
                      )}
                      <span className="ml-auto text-[9px] text-muted-foreground/40">
                        {timeAgo(p.createdAt)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* Statistics link */}
          <Link
            href="/leaderboard"
            className="flex items-center gap-1.5 rounded-md border border-violet-500/20 bg-violet-500/8 px-2.5 py-1.5 text-[10px] font-medium text-violet-500 transition-colors hover:bg-violet-500/15"
          >
            <TrophyIcon size={10} />
            Statistics
            <span className="ml-auto text-[9px] text-violet-500/50">
              View details &rarr;
            </span>
          </Link>
        </div>
      </div>
    </div>
  )
}
