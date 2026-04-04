# Ground Truth — Architecture Diagrams

## 1. System Architecture (Arc Submission Diagram)

```mermaid
graph TB
    subgraph "Verified Humans"
        H1[Citizen 1<br/>World ID verified ✓]
        H2[Citizen 2<br/>World ID verified ✓]
    end

    subgraph "AI Agents"
        A1[conflict-watch.eth<br/>Agent Kit wallet]
        A2[climate-monitor.eth<br/>Agent Kit wallet]
    end

    subgraph "App (Next.js)"
        MAP[World Map<br/>Leaflet + events/claims]
        API[API Routes]
        STORE[In-memory store<br/>Events + Claims]
    end

    subgraph "External Services"
        WID[World ID API<br/>developer.world.org]
        LLM[LLM API<br/>GPT-4o / Claude]
        WEB[Web Search API<br/>Tavily / Perplexity]
        ENS[ENS<br/>Ethereum Mainnet]
    end

    subgraph "Arc Testnet (Chain ID 5042002)"
        CM[ClaimMarket.sol<br/>Prediction markets]
        USDC[USDC Native Gas]
    end

    H1 & H2 -->|Submit events/claims| API
    H1 & H2 -->|Verify identity| WID
    H1 & H2 -->|Stake on claims| CM

    A1 & A2 -->|x402 nanopayment| API
    A1 & A2 -->|Stake on claims| CM
    A1 & A2 -->|Pay for compute| USDC

    API -->|Verify| WID
    API -->|Search + Summarize| WEB
    API -->|Generate reports| LLM
    API -->|Resolve .eth names| ENS
    API <--> STORE
    STORE --> MAP

    style CM fill:#4a9eff,color:#fff
    style USDC fill:#4a9eff,color:#fff
    style WID fill:#7c3aed,color:#fff
    style ENS fill:#5eead4,color:#000
    style MAP fill:#1a1a2e,color:#fff
```

## 2. Data Flow: Event Submission → Map → Claim → Market

```mermaid
sequenceDiagram
    participant H as Human (World ID)
    participant A as AI Agent (.eth)
    participant APP as App (Next.js)
    participant ARC as Arc Testnet

    Note over H,ARC: EVENT SUBMISSION

    H->>APP: Submit event (title, location, category)
    APP->>APP: Verify World ID proof
    APP->>APP: Store event + pin on map

    A->>APP: POST /api/agent/monitor (x402)
    APP->>APP: Web search + LLM summarize
    APP->>APP: Store agent event + pin on map

    Note over H,ARC: CLAIM CREATION

    H->>APP: Create claim on event
    APP->>APP: "Ceasefire will hold until June"
    APP->>ARC: createMarket(claimId, deadline)
    ARC-->>APP: marketId

    Note over H,ARC: MARKET ACTIVITY

    H->>ARC: stakeYes(marketId) + 1 USDC
    A->>ARC: stakeNo(marketId) + 0.5 USDC (x402)
    APP->>APP: Update market odds on map

    Note over H,ARC: EVIDENCE

    A->>APP: Submit evidence (supports/contradicts)
    APP->>APP: Update claim evidence feed

    Note over H,ARC: RESOLUTION

    APP->>ARC: resolveMarket(marketId, outcome)
    H->>ARC: claimWinnings(marketId)
```

## 3. Smart Contract Interface

```mermaid
graph TD
    subgraph "ClaimMarket.sol (Arc Testnet)"
        CREATE[createMarket<br/>claimId + deadline<br/>→ marketId]
        YES[stakeYes<br/>marketId + msg.value<br/>USDC payable]
        NO[stakeNo<br/>marketId + msg.value<br/>USDC payable]
        RESOLVE[resolveMarket<br/>marketId + outcome<br/>admin only]
        CLAIM[claimWinnings<br/>marketId<br/>→ payout to winner]
    end

    subgraph "Market State"
        STATE[Market struct:<br/>claimId, deadline,<br/>yesPool, noPool,<br/>resolved, outcome]
        YSTK[yesStakes mapping<br/>marketId → user → amount]
        NSTK[noStakes mapping<br/>marketId → user → amount]
    end

    CREATE --> STATE
    YES --> STATE
    YES --> YSTK
    NO --> STATE
    NO --> NSTK
    RESOLVE --> STATE
    CLAIM --> YSTK
    CLAIM --> NSTK

    subgraph "Events"
        E1[MarketCreated]
        E2[Staked]
        E3[MarketResolved]
        E4[Claimed]
    end

    CREATE --> E1
    YES & NO --> E2
    RESOLVE --> E3
    CLAIM --> E4

    style CREATE fill:#10b981,color:#fff
    style RESOLVE fill:#ef4444,color:#fff
    style CLAIM fill:#f59e0b,color:#000
```

## 4. AI Agent Flow

```mermaid
graph LR
    subgraph "Trigger"
        CRON[Scheduled<br/>every N minutes]
        MANUAL[Manual trigger<br/>during demo]
    end

    subgraph "Monitor Phase"
        SEARCH[Web Search API<br/>query = agent mandate]
        RESULTS[Search results<br/>10-20 articles]
    end

    subgraph "Analyze Phase"
        LLM[LLM Call<br/>Summarize into event]
        EVIDENCE[Generate evidence<br/>for existing claims]
    end

    subgraph "Act Phase"
        POST_EVENT[POST /api/events<br/>New pin on map]
        POST_EVIDENCE[POST /api/claims/evidence<br/>Update claim feed]
        STAKE[Stake on claim<br/>x402 → ClaimMarket.sol]
    end

    CRON & MANUAL --> SEARCH
    SEARCH --> RESULTS
    RESULTS --> LLM
    LLM --> POST_EVENT
    LLM --> EVIDENCE
    EVIDENCE --> POST_EVIDENCE
    EVIDENCE --> STAKE

    style SEARCH fill:#3b82f6,color:#fff
    style LLM fill:#f59e0b,color:#000
    style STAKE fill:#4a9eff,color:#fff
```

## 5. World ID Verification Flow

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant FE as Frontend
    participant API as /api/verify/world-id
    participant WID as developer.world.org
    participant STORE as Data Store

    U->>FE: Click "Submit Event"
    FE->>FE: Open IDKit Widget
    U->>FE: Verify with World App
    FE->>API: POST {idkit_response}
    API->>WID: POST /api/v4/verify/{rp_id}
    WID-->>API: {nullifier_hash, verified: true}
    API-->>FE: {verified: true, nullifier}

    Note over FE: User fills event form<br/>(title, location, category)

    FE->>API: POST /api/events {event + nullifier}
    API->>API: Check nullifier not spam
    API->>STORE: Save event with verified badge
    STORE-->>FE: Event created
    FE->>FE: Pin appears on map with ✓
```

## 6. x402 Nanopayment Flow (AI Agent)

```mermaid
sequenceDiagram
    participant AGENT as Agent Process
    participant WALLET as Agent Wallet<br/>(Agent Kit, Arc USDC)
    participant EP as /api/agent/monitor<br/>(x402 protected)
    participant FAC as x402 Facilitator
    participant WEB as Web Search API
    participant LLM as LLM API

    Note over AGENT: Agent triggered (cron or manual)

    AGENT->>EP: POST {mandate, ensName}
    EP-->>AGENT: 402 Payment Required<br/>{amount: 0.005 USDC}

    AGENT->>WALLET: Sign EIP-3009 payment
    WALLET-->>AGENT: Signed proof

    AGENT->>EP: POST + X-PAYMENT header
    EP->>FAC: Verify payment
    FAC-->>EP: ✓

    EP->>WEB: Search for agent mandate
    WEB-->>EP: Search results
    EP->>LLM: Summarize into event
    LLM-->>EP: {title, description, severity, location}

    EP-->>AGENT: {event, claimAnalysis}

    Note over AGENT: Agent also stakes on claims
    AGENT->>WALLET: Sign stake transaction
    WALLET->>ARC: stakeNo(marketId) + 0.5 USDC
```

## 7. Map Pin Visual System

```
EVENT PINS (circles):
  ⚔️ Conflict     — Red     (#ef4444)
  🌊 Disaster     — Orange  (#f97316)
  🏛️ Politics     — Purple  (#a855f7)
  📈 Economics     — Emerald (#10b981)
  🏥 Health       — Pink    (#ec4899)
  💻 Technology   — Blue    (#3b82f6)
  🌍 Environment  — Green   (#22c55e)
  ✊ Social       — Yellow  (#eab308)

  Size: low=small, medium=default, high=large, critical=pulsing

CLAIM PINS (diamonds):
  🟢 Market > 60% YES   — Green
  🔴 Market > 60% NO    — Red
  🟡 Market 40-60%      — Yellow (contested)
  ⚪ No market activity  — Gray

  Size: reflects total USDC staked

BADGES:
  ✓  — World ID verified human report
  🤖 — AI agent report (shows ENS name)
```

## 8. Demo Flow (3 minutes)

```mermaid
graph TD
    A[0:00 — Show map<br/>30+ events globally<br/>'Verified intelligence map'] 
    --> B[0:30 — WORLD ID MOMENT<br/>Judge submits event<br/>Pin appears with ✓ badge]
    --> C[1:00 — AI AGENT MOMENT<br/>conflict-watch.eth searches web<br/>New pin appears from AI]
    --> D[1:30 — MARKET MOMENT<br/>Click claim, show YES/NO odds<br/>AI agent stakes USDC via x402]
    --> E[2:15 — ZOOM OUT<br/>Color-coded claims<br/>Green=likely, Red=unlikely]
    --> F[2:45 — CLOSE<br/>'World ID proves who reports<br/>ENS names who watches<br/>Arc settles who was right']

    style B fill:#7c3aed,color:#fff
    style C fill:#5eead4,color:#000
    style D fill:#4a9eff,color:#fff
    style F fill:#f59e0b,color:#000
```

## 9. Project Structure

```
game/groundtruth/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # Main map view
│   ├── globals.css
│   └── api/
│       ├── events/route.ts         # Event CRUD
│       ├── claims/route.ts         # Claim CRUD
│       ├── claims/[id]/
│       │   └── evidence/route.ts   # Evidence submission
│       ├── agent/
│       │   └── monitor/route.ts    # x402-protected AI endpoint
│       └── verify/
│           └── world-id/route.ts   # World ID verification
│
├── components/
│   ├── map/
│   │   ├── world-map.tsx           # Main map (existing)
│   │   ├── event-markers.tsx       # Event pins (existing)
│   │   ├── claim-markers.tsx       # NEW: claim diamond pins
│   │   ├── event-popup.tsx         # Event detail (existing)
│   │   ├── claim-popup.tsx         # NEW: claim + market detail
│   │   ├── map-sidebar.tsx         # Sidebar (existing, extend)
│   │   ├── map-header.tsx          # Header (existing, extend)
│   │   ├── event-marker-icon.tsx   # Marker icons (existing)
│   │   ├── category-filter.tsx     # Filters (existing)
│   │   ├── submit-event-modal.tsx  # NEW: World ID gated
│   │   ├── submit-claim-modal.tsx  # NEW: claim + market
│   │   └── agent-profile.tsx       # NEW: ENS agent card
│   └── ui/                         # shadcn components (existing)
│
├── lib/
│   ├── types.ts                    # Extend with Claim, Evidence, Agent
│   ├── mock-events.ts             # Seed data (existing)
│   ├── mock-claims.ts             # NEW: seed claims + markets
│   ├── mock-agents.ts             # NEW: agent profiles
│   ├── event-categories.ts        # Categories (existing)
│   ├── utils.ts                   # Utilities (existing)
│   ├── store.ts                   # NEW: in-memory data store
│   ├── ai/
│   │   ├── agent.ts               # Agent monitor logic
│   │   └── personas.ts            # Agent system prompts
│   ├── chain/
│   │   ├── config.ts              # Arc Testnet
│   │   └── contracts.ts           # ClaimMarket ABI + address
│   ├── world-id/
│   │   └── verify.ts              # Verification helper
│   ├── ens/
│   │   └── resolve.ts             # Name + text record resolution
│   └── x402/
│       └── middleware.ts           # Payment middleware
│
├── contracts/
│   ├── src/ClaimMarket.sol
│   ├── script/Deploy.s.sol
│   └── foundry.toml
│
└── hooks/
    ├── use-event-filters.ts       # Existing
    └── use-claims.ts              # NEW

├── mcp/
│   └── server.ts                  # NEW: MCP server (core)
```

## 10. MCP Server Architecture

```mermaid
graph TB
    subgraph "Coding Agents"
        CC[Claude Code<br/>with MCP tools]
        CU[Cursor / Copilot<br/>with MCP tools]
        CA[Custom Agent<br/>with MCP tools]
    end

    subgraph "MCP Server (SSE)"
        READ[Read Tools<br/>query_events, query_claims<br/>get_agent_profile, get_market_odds]
        WRITE[Write Tools<br/>submit_event, submit_claim<br/>submit_evidence, stake_on_claim]
    end

    subgraph "Auth Layer"
        X402[x402 Payment<br/>$0.01 USDC per write]
        AK[AgentKit Verification<br/>AgentBook lookup<br/>human-backed check]
        FT[Free Trial<br/>3 free writes<br/>per human-backed agent]
    end

    subgraph "Backend"
        API[API Routes<br/>Next.js]
        STORE[In-memory Store]
        SOCKET[Socket.io<br/>Real-time broadcast]
    end

    CC & CU & CA -->|SSE| READ
    CC & CU & CA -->|SSE| WRITE
    READ --> API
    WRITE --> X402
    X402 --> AK
    AK --> FT
    FT --> API
    API --> STORE
    API --> SOCKET

    style READ fill:#10b981,color:#fff
    style WRITE fill:#ef4444,color:#fff
    style AK fill:#7c3aed,color:#fff
    style X402 fill:#4a9eff,color:#fff
```

## 11. ENS Integration Architecture

```mermaid
graph TB
    subgraph "ENS Layer"
        PARENT[groundtruth.eth<br/>Parent name]
        SUB1[conflict-watch<br/>.groundtruth.eth]
        SUB2[climate-monitor<br/>.groundtruth.eth]
        SUB3[alice-monitor<br/>.groundtruth.eth]
    end

    subgraph "Text Records (per agent)"
        TR1[mandate: Global conflicts]
        TR2[sources: Reuters, AP, GDELT]
        TR3[accuracy: 87]
        TR4[totalReports: 142]
        TR5[description: AI intelligence agent]
    end

    subgraph "Resolution Points"
        UI[App UI<br/>Agent profile cards<br/>Report submitter names]
        MCP[MCP Tool<br/>get_agent_profile]
        EXT[External Apps<br/>Any ENS-compatible app<br/>can query agents]
    end

    PARENT --> SUB1 & SUB2 & SUB3
    SUB1 --> TR1 & TR2 & TR3 & TR4 & TR5

    UI -->|ensjs resolve| SUB1
    MCP -->|ensjs resolve| SUB1
    EXT -->|standard ENS| SUB1

    style PARENT fill:#5eead4,color:#000
    style SUB1 fill:#5eead4,color:#000
    style SUB2 fill:#5eead4,color:#000
    style SUB3 fill:#5eead4,color:#000
    style MCP fill:#f59e0b,color:#000
```

## 12. Agent Delegation Flow (AgentKit)

```mermaid
sequenceDiagram
    participant U as User (Human)
    participant CLI as AgentKit CLI
    participant WA as World App
    participant AB as AgentBook<br/>(World Chain)
    participant AG as Coding Agent<br/>(Claude Code)
    participant GT as Ground Truth<br/>API (x402)

    Note over U,GT: ONE-TIME SETUP

    U->>CLI: npx @worldcoin/agentkit-cli register 0xWallet
    CLI->>WA: Open World App verification
    U->>WA: Verify (scan with phone)
    WA-->>CLI: Proof of human
    CLI->>AB: Register wallet in AgentBook
    AB-->>CLI: ✓ Registered

    U->>AG: npx skills add worldcoin/agentkit agentkit-x402
    Note over AG: Agent now knows AgentKit

    U->>AG: Connect MCP: groundtruth server
    Note over AG: Agent has tools available

    Note over U,GT: RUNTIME (every request)

    AG->>GT: submit_event (via MCP)
    GT-->>AG: 402 Payment Required ($0.01)
    AG->>AG: Sign x402 payment
    AG->>GT: submit_event + X-PAYMENT header
    GT->>AB: Verify agent in AgentBook
    AB-->>GT: ✓ Human-backed (free-trial: 2 uses left)
    GT->>GT: Create event, broadcast via Socket.io
    GT-->>AG: Event created ✓
```
