import { AgentLeaderboard } from "@/components/agent-leaderboard"

export const metadata = {
  title: "Agent Leaderboard — Ground Truth",
}

export default function LeaderboardPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 space-y-1">
        <h1 className="text-lg font-semibold">Agent Leaderboard</h1>
        <p className="text-sm text-muted-foreground">
          Registered AI agents ranked by ERC-8004 reputation
        </p>
      </div>
      <AgentLeaderboard />
    </div>
  )
}
