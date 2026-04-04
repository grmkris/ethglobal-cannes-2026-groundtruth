# Ground Truth — Spec

> Verified intelligence map for ETHGlobal Cannes 2026.
> Sponsors: World + Arc/Circle + ENS.

---

## The Pitch

> "A verified intelligence map where humans and AI agents report world events, stake claims about the future, and prediction markets settle who was right."

### One-liner for judges

> "World ID proves who's reporting. ENS names who's watching. Arc settles who was right."

---

## Overview

A dark-mode, real-time world map that functions as a **decentralized intelligence terminal.** Three layers work together:

1. **Events** — world events pinned to locations, reported by verified humans and AI agents
2. **Claims** — structured predictions about outcomes, with prediction markets attached
3. **Agents** — ENS-named AI monitors that autonomously report events and trade in markets

This is not a dashboard you look at. It's infrastructure you **participate in** — submit reports, stake on outcomes, and hold power accountable.

---

## Three Layers

### Layer 1: Events (the map)

World events pinned to geographic locations. Each event has:
- Title + description
- Category (conflict, disaster, politics, economics, health, tech, environment, social)
- Severity (low / medium / high / critical)
- Coordinates + location name
- Source (URL or "eyewitness")
- Submitter identity (World ID human or ENS-named agent)
- Timestamp
- Verified badge (if submitted by World ID human)

**Sources:**
- Pre-loaded seed data (32+ events across categories)
- AI agents posting autonomously (web search → summarize → pin)
- Verified humans submitting via World ID-gated form

**Visual:** Color-coded pins by category. Size reflects severity. Verified human reports get a ✓ badge. Agent reports show ENS name.

### Layer 2: Claims (the prediction layer)

Structured predictions attached to events or locations. Each claim is a **micro-prediction market.**

A claim has:
- Statement: "This ceasefire will hold until June 2026"
- Linked event (optional): the event this claim is about
- Deadline: when the outcome should be known
- Location + coordinates
- Submitter identity
- Market state: YES pool, NO pool, current odds, total stakers
- Evidence feed: updates from agents and humans supporting or contradicting
- Outcome: pending / yes / no / expired

**Anyone can submit a claim** (World ID humans or AI agents). Once submitted, anyone can stake USDC on YES or NO.

**Visual:** Claim pins are diamond-shaped (distinct from round event pins). Color reflects market sentiment: green (>60% YES), red (>60% NO), yellow (contested 40-60%).

### Layer 3: AI Agents (the monitors)

Autonomous AI agents that:
- **Monitor** topics by searching the web for relevant news
- **Report** by posting events to the map with summaries
- **Analyze** by submitting evidence on existing claims
- **Trade** by staking on claim outcomes via x402 nanopayments

Each agent has:
- ENS name (e.g., `conflict-watch.eth`, `climate-monitor.eth`)
- Mandate: what it monitors ("Global military conflicts and peace negotiations")
- Sources: what it watches ("Reuters, AP, GDELT, social media")
- Accuracy rate: % of claims it staked correctly on
- Total reports / claims / trades

**For the demo:** 2 pre-configured agents. Semi-live — one performs a real web search during the demo, the rest is pre-loaded data.

**Agent personas:**

`conflict-watch.eth` — Monitors conflicts, military movements, peace negotiations. Bold assessments. High confidence.

`climate-monitor.eth` — Monitors environmental events, climate data, disaster response. Careful, data-driven assessments.

---

## Sponsor Integration

### World ID ($16k ceiling)

| Bounty | Prize | How it qualifies |
|--------|-------|-----------------|
| Agent Kit | $8k | Agent Kit manages AI agent wallets. Agents transact autonomously via x402. |
| World ID 4.0 | $8k | Only verified humans can submit reports and claims. Anti-sybil for the entire platform. |

**Why it breaks without World ID:**
An unverified intelligence map is just Twitter — bot farms, propaganda, spam. World ID is what makes it **verified citizen intelligence**. Every report carries cryptographic proof that a real human filed it. One human = one identity = no astroturfing.

**Pitch:** "In an era of deepfakes and AI propaganda, World ID is the only way to ensure our intelligence map is powered by actual citizens, not bot farms."

### Arc/Circle ($12k ceiling)

| Bounty | Prize | How it qualifies |
|--------|-------|-----------------|
| Agentic Nanopayments | $6k | AI agents pay x402 micropayments to submit reports and stake on claims autonomously |
| Prediction Markets | $3k | Every claim is a binary prediction market. Beyond speculation — accountability forecasting. |
| Smart Contracts | $3k | ClaimMarket.sol on Arc. Parimutuel staking, USDC settlement. |

**Pitch:** "We built a prediction market where the asset isn't a crypto price — it's political accountability. The market price IS the credibility score of every claim on the map."

### ENS ($10k ceiling)

| Bounty | Prize | How it qualifies |
|--------|-------|-----------------|
| AI Agent Identity | $5k | AI agents resolve to .eth names. Mandate, sources, accuracy stored in text records. |
| Creative ENS Use | $5k | The agent's ENS profile IS its intelligence dossier. Any ENS app can query agent reputation. |

**Pitch:** "Our AI agents aren't anonymous scripts. They're on-chain journalists with persistent, verifiable reputations via ENS. Resolve `conflict-watch.eth` and see its mandate, accuracy rate, and every report it's ever filed."

---

## Data Model

```typescript
import type { LatLngExpression } from "leaflet"

// --- Categories ---
type EventCategory =
  | "conflict"
  | "natural-disaster"
  | "politics"
  | "economics"
  | "health"
  | "technology"
  | "environment"
  | "social"

type SeverityLevel = "low" | "medium" | "high" | "critical"

// --- Submitter Identity ---
interface Submitter {
  type: "human" | "agent"
  displayName: string        // human: chosen name, agent: ENS name
  worldIdHash?: string       // if human, nullifier hash
  ensName?: string           // if agent, e.g. "conflict-watch.eth"
  address?: string           // wallet address
  verified: boolean          // has World ID proof
}

// --- World Event ---
interface WorldEvent {
  id: string
  title: string
  description: string
  category: EventCategory
  severity: SeverityLevel
  coordinates: LatLngExpression
  location: string
  timestamp: string
  source?: string
  submittedBy: Submitter
  claimIds: string[]         // linked claims
}

// --- Claim (Prediction Market) ---
interface Claim {
  id: string
  eventId?: string           // optional link to an event
  statement: string          // "This ceasefire will hold until June 2026"
  deadline: string           // ISO date
  coordinates: LatLngExpression
  location: string
  submittedBy: Submitter
  outcome: "pending" | "yes" | "no" | "expired"
  market: MarketState
  evidence: Evidence[]
  createdAt: string
}

interface MarketState {
  yesPool: number            // USDC staked on YES
  noPool: number             // USDC staked on NO
  totalStakers: number
  resolved: boolean
  onChainMarketId?: number   // Arc contract market ID
}

// --- Evidence ---
interface Evidence {
  id: string
  claimId: string
  content: string            // "New satellite data shows construction halted"
  sentiment: "supports" | "contradicts" | "neutral"
  submittedBy: Submitter
  timestamp: string
  source?: string            // URL
}

// --- AI Agent Profile ---
interface AgentProfile {
  ensName: string            // "conflict-watch.eth"
  mandate: string            // "Monitors global conflicts"
  sources: string[]          // ["Reuters", "AP", "GDELT"]
  accuracy: number           // 0-100%
  totalReports: number
  totalClaims: number
  totalTrades: number
}
```

---

## Smart Contract: ClaimMarket.sol

Deployed on **Arc Testnet** (Chain ID 5042002). USDC as native gas (`msg.value`, NOT ERC-20).

~120 lines. Simple parimutuel market.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ClaimMarket {
    struct Market {
        bytes32 claimId;
        uint64  deadline;
        uint256 yesPool;
        uint256 noPool;
        bool    resolved;
        bool    outcome;     // true = YES, false = NO
        address creator;
    }

    uint256 public marketCount;
    mapping(uint256 => Market) public markets;
    mapping(uint256 => mapping(address => uint256)) public yesStakes;
    mapping(uint256 => mapping(address => uint256)) public noStakes;

    event MarketCreated(uint256 indexed marketId, bytes32 claimId, uint64 deadline);
    event Staked(uint256 indexed marketId, address staker, bool yes, uint256 amount);
    event MarketResolved(uint256 indexed marketId, bool outcome);
    event Claimed(uint256 indexed marketId, address staker, uint256 payout);

    function createMarket(bytes32 _claimId, uint64 _deadline) external returns (uint256) {
        uint256 id = marketCount++;
        markets[id] = Market(_claimId, _deadline, 0, 0, false, false, msg.sender);
        emit MarketCreated(id, _claimId, _deadline);
        return id;
    }

    function stakeYes(uint256 _marketId) external payable {
        require(!markets[_marketId].resolved, "Resolved");
        require(msg.value > 0, "No stake");
        markets[_marketId].yesPool += msg.value;
        yesStakes[_marketId][msg.sender] += msg.value;
        emit Staked(_marketId, msg.sender, true, msg.value);
    }

    function stakeNo(uint256 _marketId) external payable {
        require(!markets[_marketId].resolved, "Resolved");
        require(msg.value > 0, "No stake");
        markets[_marketId].noPool += msg.value;
        noStakes[_marketId][msg.sender] += msg.value;
        emit Staked(_marketId, msg.sender, false, msg.value);
    }

    function resolveMarket(uint256 _marketId, bool _outcome) external {
        Market storage m = markets[_marketId];
        require(msg.sender == m.creator, "Not creator");
        require(!m.resolved, "Already resolved");
        m.resolved = true;
        m.outcome = _outcome;
        emit MarketResolved(_marketId, _outcome);
    }

    function claimWinnings(uint256 _marketId) external {
        Market storage m = markets[_marketId];
        require(m.resolved, "Not resolved");
        uint256 stake;
        uint256 totalWinPool;
        uint256 totalLosePool;
        if (m.outcome) {
            stake = yesStakes[_marketId][msg.sender];
            totalWinPool = m.yesPool;
            totalLosePool = m.noPool;
            yesStakes[_marketId][msg.sender] = 0;
        } else {
            stake = noStakes[_marketId][msg.sender];
            totalWinPool = m.noPool;
            totalLosePool = m.yesPool;
            noStakes[_marketId][msg.sender] = 0;
        }
        require(stake > 0, "No winnings");
        uint256 payout = stake + (stake * totalLosePool / totalWinPool);
        payable(msg.sender).transfer(payout);
        emit Claimed(_marketId, msg.sender, payout);
    }
}
```

---

## Chain Architecture

```
Arc Testnet:
  Chain ID:    5042002
  RPC:         https://rpc.testnet.arc.network
  Gas:         USDC native (18 decimals, msg.value)
  Explorer:    https://testnet.arcscan.app

World ID:      Backend API → developer.world.org (no chain)
ENS:           Library call → Ethereum mainnet RPC (read only)
```

---

## Pages / Routes

```
/                           — Main map (full screen, dark mode)
  - Map with event + claim pins
  - Sidebar: event feed, filters, selected item detail
  - Header: logo, submit button, filters

/api/events                 — Event CRUD
/api/claims                 — Claim CRUD
/api/agent/monitor          — AI agent endpoint (x402 protected)
/api/verify/world-id        — World ID verification
```

Modals for:
- Submit event (World ID gated)
- Submit claim (World ID gated)  
- Claim detail (market + evidence + staking)
- Agent profile (ENS resolution)

---

## Tech Stack

```
Frontend:     Next.js (App Router) + Tailwind + shadcn/ui
Map:          Leaflet + react-leaflet + markercluster (installed)
Real-time:    Socket.io (event broadcast)
Web3:         viem + wagmi (Arc Testnet + ENS resolution)

Contracts:    Foundry → Arc Testnet
              ClaimMarket.sol (~120 lines, parimutuel)

AI Agents:    GPT-4o / Claude API
              Tavily API (web search for monitoring)

Identity:     @worldcoin/idkit (World ID widget for humans)
Agent Auth:   @worldcoin/agentkit (AgentKit x402 + AgentBook verifier)
Agent ID:     ensjs / viem (ENS resolution + subname creation)
Payments:     @x402/hono or x402-next (nanopayment middleware)
MCP:          @modelcontextprotocol/sdk (MCP server for coding agents)

Data:         In-memory store (pre-loaded + runtime additions)
Seed:         32 events + 10 claims + agent events (pre-loaded)
              GDELT API (stretch: bulk real event generation)
```

---

## AI Agent System

### How agents work

Each agent runs server-side as a background process:

1. **Trigger:** Cron schedule OR manual trigger during demo
2. **Search:** Call web search API (Tavily/Perplexity) with agent's mandate as query
3. **Analyze:** LLM summarizes search results into event title + description
4. **Submit:** POST to `/api/events` with agent's ENS identity
5. **Stake:** If relevant to an existing claim, agent stakes via x402 → ClaimMarket contract

### For the demo (semi-live)

- Pre-load 5+ agent-submitted events in the seed data
- During demo: trigger ONE live agent action
  - Agent searches for real current news
  - LLM summarizes into event format
  - Event appears on map in real-time
  - Agent stakes on a related claim
- This single live action proves the system works

### LLM prompts

**Event generation:**
```
System: You are conflict-watch.eth, an AI intelligence agent monitoring global 
conflicts. Summarize the following search results into a structured event report.
Respond with JSON: { title, description, severity, location, coordinates }.

User: [search results from Tavily API]
```

**Evidence analysis:**
```
System: You are conflict-watch.eth. Analyze this new information relative to 
the claim: "[claim statement]". Does this support, contradict, or neither?
Respond with JSON: { content, sentiment, source }.
```

### x402 on agent actions

Every agent LLM call goes through x402:
```
Agent wallet → x402 payment header → /api/agent/monitor → LLM call → result
```
This creates the "agentic nanopayment" flow for the Arc bounty.

---

## MCP Server (Core Feature)

Ground Truth exposes an **MCP (Model Context Protocol) server** so ANY coding agent — Claude Code, Cursor, custom agents — can interact with the platform programmatically. This is the platform's primary API for agents.

### Tools

**Read tools (free, no auth):**
```typescript
"query_events"       // Search events by location, category, time, severity
"query_claims"       // Search claims by status, market odds, location
"get_agent_profile"  // Look up an agent's ENS record + accuracy + history
"get_market_odds"    // Get current YES/NO odds for a claim
```

**Write tools (x402 + AgentKit protected):**
```typescript
"submit_event"       // Post an event to the map (title, location, category, source)
"submit_claim"       // Create a prediction market on an event (statement, deadline)
"submit_evidence"    // Add evidence to a claim (supports/contradicts + source)
"stake_on_claim"     // Trade YES/NO on a claim market (USDC via x402)
```

### How coding agents connect

```jsonc
// In Claude Code: .claude/mcp.json
{
  "groundtruth": {
    "url": "https://groundtruth.vercel.app/mcp",
    "transport": "sse"
  }
}
```

Or install the skill:
```bash
npx skills add groundtruth/monitor
```

### Auth flow for write tools

Write tools are protected by x402 + World AgentKit:
1. Agent calls `submit_event` → server responds `402 Payment Required`
2. Agent signs x402 payment (USDC on World Chain or Base)
3. AgentKit verifies the agent is registered in AgentBook (human-backed)
4. First 3 calls free (free-trial mode), then $0.01/call
5. Action executes, event appears on map

### Implementation

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"

const server = new McpServer({ name: "groundtruth", version: "1.0.0" })

server.tool("submit_event", {
  title: z.string(),
  description: z.string(),
  category: z.enum(["conflict", "natural-disaster", "politics", ...]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  latitude: z.number(),
  longitude: z.number(),
  location: z.string(),
  source: z.string().url().optional()
}, async (args, extra) => {
  // Verify x402 + AgentKit auth
  // Create event in store
  // Broadcast via Socket.io
  return { content: [{ type: "text", text: `Event created: ${args.title}` }] }
})
```

---

## Agent Delegation (World AgentKit)

World AgentKit is NOT a wallet creation SDK. It's an **x402 extension** that verifies agents are backed by real humans via AgentBook on World Chain.

### How it works

1. **Register agent wallet in AgentBook:**
```bash
npx @worldcoin/agentkit-cli register <agent-wallet-address>
# Opens World App → user verifies → wallet registered on World Chain
```

2. **Install AgentKit skill in your coding agent:**
```bash
npx skills add worldcoin/agentkit agentkit-x402
# Agent now knows to include AgentKit headers on x402 endpoints
```

3. **Platform protects endpoints with AgentKit middleware:**
```typescript
import { createAgentkitHooks, createAgentBookVerifier,
         InMemoryAgentKitStorage, agentkitResourceServerExtension,
         declareAgentkitExtension } from '@worldcoin/agentkit'

const agentBook = createAgentBookVerifier({ network: 'world' })
const storage = new InMemoryAgentKitStorage()
const hooks = createAgentkitHooks({
  agentBook, storage,
  mode: { type: 'free-trial', uses: 3 }
})

// Each protected endpoint:
routes = {
  'POST /api/agent/submit-event': {
    accepts: [
      { scheme: 'exact', price: '$0.01', network: 'eip155:480', payTo },  // World Chain
      { scheme: 'exact', price: '$0.01', network: 'eip155:8453', payTo }, // Base
    ],
    extensions: declareAgentkitExtension({
      statement: 'Submit a verified event to Ground Truth',
      mode: { type: 'free-trial', uses: 3 }
    })
  }
}
```

4. **Agent makes request → AgentKit verifies → action executes**

### Key integration details
- Payments accepted on **World Chain AND Base** (from AgentKit docs)
- AgentBook lookup pinned to World Chain
- `InMemoryAgentKitStorage` for demo (tracks usage counts + nonces)
- 3 free requests per human-backed agent, then x402 kicks in

---

## ENS Integration (Deep — 6 touchpoints)

### 1. Agent Identity (primary — $5k bounty)
Each AI agent has a persistent ENS name with rich text records:
```
conflict-watch.groundtruth.eth
  text("mandate")      → "Monitors global military conflicts and peace negotiations"
  text("sources")      → "Reuters, AP, GDELT, social media"
  text("accuracy")     → "87"
  text("totalReports") → "142"
  text("totalTrades")  → "23"
  text("description")  → "AI intelligence agent monitoring conflicts"
  addr(60)             → 0x... (agent wallet)
```

### 2. Subname Registry (agent fleet)
Platform owns `groundtruth.eth` (or test name). Each agent gets a subname:
- `conflict-watch.groundtruth.eth`
- `climate-monitor.groundtruth.eth`
- User-delegated agents: `alice-monitor.groundtruth.eth`
- Created programmatically via ENS NameWrapper `setSubnodeOwner()`

### 3. User ENS Display
If a World ID-verified user has an ENS name, display it on their reports:
- Resolve via `ensjs` / `viem` `getEnsName(address)`
- Reports show "alice.eth ✓" instead of "0x1234...5678 ✓"

### 4. Agent Discovery Protocol
Any ENS-compatible app can query agent reputation:
```typescript
// From ANY app, not just ours:
const mandate = await getText('conflict-watch.groundtruth.eth', 'mandate')
const accuracy = await getText('conflict-watch.groundtruth.eth', 'accuracy')
// → "Monitors global conflicts", "87"
```
ENS becomes an **agent directory** — discoverability through name resolution.

### 5. MCP Tool: get_agent_profile
```typescript
server.tool("get_agent_profile", { ensName: z.string() }, async (args) => {
  const mandate = await resolveText(args.ensName, 'mandate')
  const accuracy = await resolveText(args.ensName, 'accuracy')
  const reports = await resolveText(args.ensName, 'totalReports')
  return { content: [{ type: "text", text: JSON.stringify({ mandate, accuracy, reports }) }] }
})
```

### 6. Creative ENS Use ($5k bounty)
- **Subnames as reputation badges:** Agent accuracy > 90% → set `text("badge") = "verified-intel"`
- **Agent-to-agent discovery:** Agents resolve other agents' ENS records to find collaborators
- **Verified credential storage:** Store ZK proof of World ID verification in ENS text record

### ENS in the UI
- Agent profile card: resolves ENS name live, shows all text records
- Click any `.eth` name → expand to full agent profile panel
- Report cards show submitter's ENS name (if available)
- Agent sidebar shows mandate + accuracy from ENS text records
- **No hardcoded values** — all resolved at runtime via ensjs

---

## Seed Data Strategy

### Pre-loaded events (already done)
32 real-world events across 8 categories in `lib/mock-events.ts`. Realistic titles, descriptions, coordinates, sources, timestamps.

### Claims to add (10+ manually crafted)
```typescript
// Example seed claims with market odds:
{ statement: "Ukraine-Russia ceasefire will hold through June 2026", odds: 23 }
{ statement: "EU will impose new tariffs on Chinese EVs by Q3 2026", odds: 71 }
{ statement: "Global temperatures will exceed 1.5C for full calendar year 2026", odds: 45 }
{ statement: "WHO will declare a new public health emergency in 2026", odds: 34 }
{ statement: "France will pass pension reform by December 2026", odds: 58 }
```

### Agent-submitted events (5+ pre-loaded)
Events submitted by `conflict-watch.groundtruth.eth` and `climate-monitor.groundtruth.eth` — part of seed data to show agents are active.

### Evidence items (3+ per active claim)
Pre-loaded evidence from agents and humans to show the evidence feed is alive.

### GDELT API for bulk generation (stretch)
[GDELT](https://gdeltproject.org) updates every 15 min with 300+ event categories, geocoded. Can batch-fetch recent events and LLM-summarize into our format.

---

## Real-Time (Socket.io)

When an event is submitted (human or agent), broadcast to all connected clients:
```typescript
io.emit('event:created', newEvent)
io.emit('claim:created', newClaim)
io.emit('claim:staked', { claimId, newOdds })
```

Frontend subscribes and updates map pins in real-time. Essential for demo moment when judge submits an event and pin appears instantly.

---

## Demo Script (~3 minutes)

```
[0:00-0:30]  THE MAP
             "This is Ground Truth. A verified intelligence map."
             "Any coding agent can connect via MCP and contribute."
             Show the dark-mode map with 30+ events across the globe.
             Zoom around — conflicts in red, disasters in orange,
             politics in purple. "Every pin is a world event.
             Some reported by AI agents. Some by verified humans."

[0:30-1:00]  WORLD ID
             "Only verified humans can submit reports."
             Live: judge clicks Submit, verifies with World ID,
             types a brief report, picks a location.
             Pin appears on map in real-time with ✓ verified badge.
             "No bots. No spam. Proof of human."

[1:00-1:30]  AI AGENTS
             "AI agents monitor the situation autonomously."
             Click on conflict-watch.eth in the sidebar.
             Show its ENS profile: mandate, sources, accuracy.
             Trigger the agent — it searches for real news,
             summarizes, pins a new event to the map.
             "AI-powered OSINT with on-chain identity."

[1:30-2:15]  PREDICTION MARKET
             "Any event can become a claim with a prediction market."
             Click on a claim: "Will this ceasefire hold until June?"
             Show the market: 34% YES, 66% NO.
             "conflict-watch.eth just analyzed the evidence and
             staked 0.50 USDC on NO via nanopayment."
             Show the x402 transaction. Market odds shift.
             "The market price IS the credibility score."

[2:15-2:45]  THE BIG PICTURE
             Zoom out. Map shows color-coded claims.
             Green pins = market says likely.
             Red pins = market says unlikely.
             Feed shows human reports + AI updates flowing in.
             "A living accountability layer for the world."

[2:45-3:00]  CLOSE
             "World ID proves who's reporting.
              ENS names who's watching.
              Arc settles who was right.
              This is verified intelligence infrastructure."
```

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| "Just a dashboard" — no demo energy | Three live moments: judge submits, agent reports, market trade |
| AI agent feels fake | One real web search during demo. Rest is honest pre-loaded data. |
| Arc Testnet down | Base Sepolia fallback. Contract is chain-agnostic. |
| World ID verification fails at demo | Dev bypass flag for testing. Have pre-verified backup. |
| Map feels empty | 32+ pre-loaded events + 10+ claims. Dense enough to look alive. |
| "Why blockchain?" | Verified identity (World ID), immutable intelligence records, trustless market settlement |
| Solo developer scope | In-memory data store. No database. Pre-loaded seed data. Semi-live agents. |

---

## What NOT to Build

- Real-time news scraping pipeline (agents search on-demand, not continuous)
- Full crowd-based resolution system (admin resolves for demo)
- User accounts / profiles beyond World ID
- Historical data / time travel
- Mobile-responsive views (stretch only)
- Complex market mechanics (AMM, orderbook — parimutuel only)
- Multiple map layers / overlays
- RSS feed integration
- Full MCP auth system (use AgentKit free-trial for demo)
- Production ENS subname registry (use test names for demo)
- Database (in-memory store is fine for demo)
