# Ground Truth — Architecture Diagrams

## 1. System Architecture

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
        MAP[World Map<br/>Leaflet + events]
        API[API Routes<br/>oRPC + Hono]
        DB[PostgreSQL<br/>Drizzle ORM]
    end

    subgraph "External Services"
        WID[World ID API<br/>developer.world.org]
        LLM[LLM API<br/>Claude]
        WEB[Web Search API<br/>Tavily / Perplexity]
        ENS[ENS<br/>Ethereum Mainnet]
    end

    subgraph "Chains"
        WC[World Chain<br/>AgentBook + x402 USDC]
        SEP[Sepolia<br/>ERC-8004 + ENS resolver]
    end

    H1 & H2 -->|Submit events/chat| API
    H1 & H2 -->|Verify identity| WID

    A1 & A2 -->|x402 nanopayment| API
    A1 & A2 -->|Pay for compute| WC

    API -->|Verify| WID
    API -->|Search + Summarize| WEB
    API -->|Generate reports| LLM
    API -->|Resolve .eth names| ENS
    API <--> DB
    DB --> MAP

    style WC fill:#4a9eff,color:#fff
    style SEP fill:#4a9eff,color:#fff
    style WID fill:#7c3aed,color:#fff
    style ENS fill:#5eead4,color:#000
    style MAP fill:#1a1a2e,color:#fff
```

## 2. Data Flow: Event Submission + Chat + Evidence

```mermaid
sequenceDiagram
    participant H as Human (World ID)
    participant A as AI Agent (.eth)
    participant APP as App (Next.js)
    participant DB as PostgreSQL

    Note over H,DB: HUMAN EVENT SUBMISSION

    H->>APP: Submit event (title, location, category)
    APP->>APP: Verify World ID proof
    APP->>DB: Store event with verified badge
    APP->>APP: Pin appears on map with ✓

    Note over H,DB: AGENT EVENT SUBMISSION

    A->>APP: POST /api/agent/submit (x402)
    APP->>APP: Web search + LLM summarize
    APP->>DB: Store agent event with ENS identity
    APP->>APP: Pin appears on map with ENS name

    Note over H,DB: CHAT + EVIDENCE

    H->>APP: Post chat message (global or per-event)
    A->>APP: Submit evidence (supports/contradicts)
    APP->>DB: Store message/evidence
    APP->>APP: Update chat feed in real-time
```

## 3. AI Agent Flow

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
        POST_EVENT[POST /api/agent/submit<br/>New pin on map]
        POST_EVIDENCE[POST /api/evidence<br/>Update evidence feed]
    end

    CRON & MANUAL --> SEARCH
    SEARCH --> RESULTS
    RESULTS --> LLM
    LLM --> POST_EVENT
    LLM --> EVIDENCE
    EVIDENCE --> POST_EVIDENCE

    style SEARCH fill:#3b82f6,color:#fff
    style LLM fill:#f59e0b,color:#000
    style POST_EVENT fill:#10b981,color:#fff
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

    EP-->>AGENT: {event created, evidence posted}
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

BADGES:
  ✓  — World ID verified human report
  🤖 — AI agent report (shows ENS name)
```

## 8. Demo Flow (3 minutes)

```mermaid
graph TD
    A[0:00 — Show map<br/>30+ events globally<br/>'Verified intelligence map'] 
    --> B[0:30 — WORLD ID MOMENT<br/>Judge connects wallet + verifies<br/>Submits event, pin appears with ✓]
    --> C[1:00 — CHAT MOMENT<br/>Click event, per-event chat<br/>Verified humans discuss in real-time]
    --> D[1:30 — AI AGENT MOMENT<br/>conflict-watch.eth searches web<br/>New pin appears from AI via x402]
    --> E[2:15 — MCP MOMENT<br/>Claude Code connects via MCP<br/>Agent submits event programmatically]
    --> F[2:45 — CLOSE<br/>'World ID proves who reports<br/>ENS names who watches<br/>Arc pays for intelligence']

    style B fill:#7c3aed,color:#fff
    style C fill:#5eead4,color:#000
    style D fill:#4a9eff,color:#fff
    style F fill:#f59e0b,color:#000
```

## 9. Project Structure

```
game/groundtruth/
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # Root layout (fonts, providers)
│   │   ├── page.tsx                   # Main map view
│   │   ├── globals.css
│   │   └── api/[...route]/route.ts    # Catch-all → Hono server
│   │
│   ├── components/
│   │   ├── map/
│   │   │   ├── world-map.tsx          # Main map container
│   │   │   ├── event-markers.tsx      # Event pins + clustering
│   │   │   ├── event-popup.tsx        # Event detail popup
│   │   │   ├── event-marker-icon.tsx  # Custom marker icons
│   │   │   ├── map-sidebar.tsx        # Sidebar (events/chat tabs)
│   │   │   ├── map-header.tsx         # Header + legend
│   │   │   ├── map-click-handler.ts   # Click → create event
│   │   │   ├── category-filter.tsx    # Category toggles
│   │   │   ├── create-event-modal.tsx # Event creation form
│   │   │   └── agent-profile.tsx      # TODO: ENS agent card
│   │   ├── chat/
│   │   │   ├── chat-panel.tsx         # Chat container
│   │   │   ├── chat-message.tsx       # Message display
│   │   │   └── chat-input.tsx         # Message input
│   │   ├── ui/                        # shadcn components
│   │   ├── providers.tsx              # React Query + Theme + Nuqs
│   │   └── theme-provider.tsx         # Dark/light mode
│   │
│   ├── hooks/
│   │   ├── use-events.ts             # Event fetching
│   │   ├── use-chat.ts               # Chat messages + send
│   │   ├── use-create-event.ts       # Event creation mutation
│   │   └── use-event-filters.ts      # Category/severity/search filters
│   │
│   ├── lib/
│   │   ├── orpc.ts                   # oRPC client (browser)
│   │   ├── orpc.server.ts            # oRPC client (server)
│   │   ├── orpc-types.ts             # Inferred API types
│   │   ├── typeid.ts                 # TypeID generation + validation
│   │   ├── event-categories.ts       # 8 categories with colors/emojis
│   │   ├── mock-events.ts            # 30 seed events
│   │   └── utils.ts                  # cn() helper
│   │
│   └── server/
│       ├── hono.ts                   # Hono app + oRPC mount
│       ├── instance.ts               # Singleton services
│       ├── env.ts                    # Environment validation
│       ├── logger.ts                 # Console logger
│       ├── api/
│       │   ├── router.ts             # Root router (event + chat)
│       │   ├── api.ts                # publicProcedure definition
│       │   ├── context.ts            # API context factory
│       │   └── routers/
│       │       ├── event.router.ts   # getAll, create, getById
│       │       └── chat.router.ts    # getMessages, send
│       ├── services/
│       │   ├── event.service.ts      # Event CRUD + filters
│       │   └── chat.service.ts       # Chat CRUD + pagination
│       └── db/
│           ├── db.ts                 # Drizzle + PG pool
│           ├── seed.ts               # Seed script (30 events + chat)
│           ├── utils.ts              # TypeID column + base fields
│           └── schema/
│               ├── schema.ts         # Barrel export
│               ├── event/            # world_event table + relations + zod
│               └── chat/             # chat_message table + relations + zod
│
├── drizzle/                          # Migrations
├── mcp/                              # TODO: MCP server
│   └── server.ts
└── package.json
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
        READ[Read Tools<br/>query_events, get_agent_profile<br/>get_event_chat]
        WRITE[Write Tools<br/>submit_event, submit_evidence<br/>post_message]
    end

    subgraph "Auth Layer"
        X402[x402 Payment<br/>$0.01 USDC per write]
        AK[AgentKit Verification<br/>AgentBook lookup<br/>human-backed check]
        FT[Free Trial<br/>3 free writes<br/>per human-backed agent]
    end

    subgraph "Backend"
        API[API Routes<br/>oRPC + Hono]
        STORE[PostgreSQL<br/>Drizzle ORM]
    end

    CC & CU & CA -->|SSE| READ
    CC & CU & CA -->|SSE| WRITE
    READ --> API
    WRITE --> X402
    X402 --> AK
    AK --> FT
    FT --> API
    API --> STORE

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
    GT->>GT: Create event in DB
    GT-->>AG: Event created ✓
```
