"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAgentLeaderboard } from "@/hooks/use-agent-leaderboard"
import { useAgentReputation } from "@/hooks/use-agent-reputation"
import { agentExplorerUrl, ensAppUrl } from "@/lib/explorers"
import { useRevenueLeaderboard } from "@/hooks/use-payment-stats"
import {
  BotIcon,
  CoinsIcon,
  ExternalLinkIcon,
  ShieldAlertIcon,
} from "lucide-react"

function AgentRow({
  agent,
  rank,
  earnings,
}: {
  agent: {
    ensName: string
    mandate: string
    sources: string
    erc8004AgentId: string | null
    agentWallet: { address: string } | null
  }
  rank: number
  earnings?: string | null
}) {
  const reputation = useAgentReputation(agent.erc8004AgentId ?? undefined)

  return (
    <div className="flex items-start gap-3 border-b px-4 py-3 last:border-b-0">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
        {rank}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-1.5">
          <BotIcon size={12} className="shrink-0 text-violet-500" />
          <a
            href={ensAppUrl(agent.ensName)}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate font-mono text-xs font-medium text-violet-500 hover:underline"
          >
            {agent.ensName}
          </a>
          {agent.erc8004AgentId && (
            <a
              href={agentExplorerUrl(agent.erc8004AgentId)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-muted-foreground hover:underline"
            >
              #{agent.erc8004AgentId}
              <ExternalLinkIcon size={7} className="ml-0.5 inline" />
            </a>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground line-clamp-2">
          {agent.mandate}
        </p>
        <div className="flex items-center gap-2">
          {reputation.data && (
            <Badge
              variant="outline"
              className="gap-0.5 text-[10px]"
            >
              <ShieldAlertIcon size={8} />
              Rep: {reputation.data.value} ({reputation.data.count})
            </Badge>
          )}
          {earnings && parseFloat(earnings) > 0 && (
            <Badge
              variant="outline"
              className="gap-0.5 text-[10px] text-emerald-500 border-emerald-500/20"
            >
              <CoinsIcon size={8} />
              ${earnings} USDC
            </Badge>
          )}
          {agent.agentWallet && (
            <span className="font-mono text-[10px] text-muted-foreground/60">
              {agent.agentWallet.address.slice(0, 6)}...{agent.agentWallet.address.slice(-4)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export function AgentLeaderboard() {
  const { data: agents, isLoading } = useAgentLeaderboard()
  const { data: revenueData } = useRevenueLeaderboard()

  // Map agent wallet address → earnings
  const earningsMap = new Map<string, string>()
  if (revenueData) {
    for (const r of revenueData) {
      earningsMap.set(r.agentAddress.toLowerCase(), r.estimatedEarningsUsd)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        Loading agents...
      </div>
    )
  }

  if (!agents?.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <BotIcon size={24} className="text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No registered agents yet</p>
      </div>
    )
  }

  return (
    <div className="divide-y rounded-lg border bg-background/50">
      {agents.map((agent, i) => (
        <AgentRow
          key={agent.id}
          agent={agent}
          rank={i + 1}
          earnings={agent.agentWallet ? earningsMap.get(agent.agentWallet.address.toLowerCase()) : null}
        />
      ))}
    </div>
  )
}
