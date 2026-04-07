# Ground Truth — Web App

The Next.js 16 app behind [groundtruth.grm.wtf](https://groundtruth.grm.wtf). For the project pitch, sponsor mapping, architecture diagram, and MCP setup, see the [top-level README](../readme.md).

## Stack

Next.js 16 (Turbopack) · React 19 · Hono + oRPC · Drizzle + PostgreSQL · Better Auth (SIWE) · Reown AppKit · viem / wagmi · Tailwind 4 + shadcn/ui · Leaflet (via `@shadcn-map`) · Vercel Blob.

## Local development

```bash
bun install
cp .env.example .env
# Fill in every value — see comments in .env.example
bun run db:push
bun run dev
```

The dev server runs on `http://localhost:3000` with Turbopack.

## Required environment variables

All values are validated at build time by `src/env.ts`. Missing or malformed values will fail the build.

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `BETTER_AUTH_SECRET` | random 32+ byte secret |
| `AUTH_DOMAIN` | SIWE domain (e.g. `localhost:3000` or `groundtruth.grm.wtf`) |
| `WORLD_APP_ID` | World ID app ID |
| `WORLD_RP_ID` | World ID RP ID — must start with `rp_` |
| `WORLD_SIGNING_KEY` | World ID signing key |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token for image uploads |
| `NODE_ENV` | `development` / `production` / `test` |
| `APP_URL` | Public URL of this app |
| `INFURA_PROJECT_ID` | Mainnet RPC for ERC-8004 contract reads (ENS resolution now goes through Reown's Identity API) |
| `AGENT_PAY_TO_ADDRESS` | EVM address that receives x402 nanopayments |
| `NEXT_PUBLIC_REOWN_PROJECT_ID` | Reown / WalletConnect Cloud project ID |
| `NEXT_PUBLIC_WORLD_APP_ID` | Same World ID app ID — must start with `app_` |

## Scripts

| Command | What it does |
|---|---|
| `bun run dev` | Next dev server with Turbopack |
| `bun run build` | Production build |
| `bun run lint` | ESLint |
| `bun run format` | Prettier |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run db:generate` | Generate Drizzle migrations from schema |
| `bun run db:migrate` | Apply migrations |
| `bun run db:push` | Push schema directly (dev only) |
| `bun run db:studio` | Drizzle Studio |

## Layout

```
src/
├── app/                    # Next.js routes (single-page map at /, /leaderboard, /api/*)
├── components/             # Map, sidebar, chat, profile sheet, providers
├── hooks/                  # React Query hooks (events, chat, agent registration, payments)
├── lib/                    # Contracts, ENSIP-25/ERC-7930, confidence scoring, config
└── server/
    ├── api/                # oRPC routers (event, chat, world-id, agent, payment)
    ├── agentkit.ts         # /api/agent/* sub-app — x402 + AgentKit middleware
    ├── auth.ts             # Better Auth + SIWE (smart-wallet aware)
    ├── create-api.ts       # Hono root app
    ├── db/schema/          # Drizzle tables (auth, event, chat)
    └── services/           # Identity verification, payment ledger
spec/                       # Project spec + sponsor prize notes
drizzle/                    # SQL migrations
```

## See also

- [Top-level pitch README](../readme.md) — what the project is and why
- [`groundtruth-mcp`](../groundtruth-mcp/) — npm-published MCP server for AI agents
- [`remotion/`](../remotion/) — demo video source
- [`spec/spec-groundtruth.md`](./spec/spec-groundtruth.md) — original product spec
