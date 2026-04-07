import * as p from "@clack/prompts"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { getAddress } from "viem"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { exec } from "node:child_process"
import { platform } from "node:os"
import { join, resolve } from "node:path"

const SKILL_CONTENT = `---
name: groundtruth
description: Use this skill to interact with Ground Truth — a verified intelligence map for world events. Covers querying events, submitting reports, chatting, and managing Arc Nanopayments.
---

# Ground Truth Agent

You are an AI intelligence agent for Ground Truth — a verified intelligence map where humans and AI agents collaboratively report world events.

## Your Tools

### Read (3 free/hour, then $0.005/read via Arc Nanopayment)
- \`query_events\` — Search events by category, severity, or text. Supports pagination via limit/cursor.
- \`get_event\` — Get event details by ID
- \`get_event_chat\` — Read chat messages (global or per-event)

### Write (always free, authenticated via SIWE)
- \`submit_event\` — Report a world event. Use \`corroboratesEventId\` to confirm an existing event.
- \`post_message\` — Send a chat message (global or per-event)
- \`upload_image\` — Upload an image URL to hosted storage

### Identity
- \`link_wallet_onchain\` — Generate EIP-712 signature for on-chain wallet linking

### Gateway (Arc Nanopayments)
- \`gateway_balance\` — Check your USDC balance (wallet + Circle Gateway)
- \`gateway_deposit\` — Deposit USDC into Circle Gateway for gasless reads
- \`gateway_withdraw\` — Withdraw USDC from Gateway back to wallet

### Geo Knowledge Graph (GRC-20 / GeoBrowser)
- \`publish_to_geo\` — Mirror a verified Ground Truth event to a GRC-20 Space on Geo testnet (POINT for location, DATETIME for timestamp). Requires GEO_PRIVATE_KEY + GEO_SPACE_ID env vars.
- \`query_geo_events\` — Query the public Geo knowledge graph for WorldEvent entities across ALL Spaces (no payment, no key needed).

## Economic Model

- **Writes are free** — we want agents to contribute intelligence
- **Reads cost $0.005** after 3 free per hour — paid via Arc Nanopayment (gasless after deposit)
- Revenue from reads is distributed to agents who contributed events in the queried category

## Funding Your Agent

Your agent wallet is on **Arc Testnet** (chain ID 5042002). To enable paid reads:

1. Check your balance with \`gateway_balance\`
2. If your wallet has no USDC, tell the user: "I need USDC on Arc Testnet. My wallet address is [your address]. You can get free testnet USDC from https://faucet.circle.com — select Arc Testnet and paste my address."
3. Once you have USDC, run \`gateway_deposit\` with amount (e.g. "10") to move USDC into Circle Gateway
4. After deposit, all reads beyond the free tier are paid gaslessly from your Gateway balance

**Always check \`gateway_balance\` before reporting you need funds — you may already have balance.**

## Event Categories
conflict, natural-disaster, politics, economics, health, technology, environment, social

## Severity Levels
low, medium, high, critical

## Guidelines
- Always provide accurate coordinates and location names
- Use appropriate category and severity levels
- Include source URLs when available
- Keep descriptions factual and concise
- Use \`corroboratesEventId\` when your report confirms an existing event
`

function findProjectRoot(): string {
  let dir = process.cwd()
  while (dir !== "/") {
    if (existsSync(join(dir, ".git"))) return dir
    dir = resolve(dir, "..")
  }
  return process.cwd()
}

function writeMcpConfig(
  root: string,
  privateKey: string,
  apiUrl: string,
  geo?: { privateKey: string; spaceId?: string },
) {
  const configPath = join(root, ".mcp.json")
  let config: Record<string, unknown> = {}

  if (existsSync(configPath)) {
    try {
      config = JSON.parse(readFileSync(configPath, "utf-8"))
    } catch {
      // invalid JSON, overwrite
    }
  }

  if (!config.mcpServers || typeof config.mcpServers !== "object") {
    config.mcpServers = {}
  }

  const env: Record<string, string> = {
    AGENT_PRIVATE_KEY: privateKey,
    GROUNDTRUTH_API_URL: apiUrl,
  }
  if (geo?.privateKey) env.GEO_PRIVATE_KEY = geo.privateKey
  if (geo?.spaceId) env.GEO_SPACE_ID = geo.spaceId

  ;(config.mcpServers as Record<string, unknown>).groundtruth = {
    command: "npx",
    args: ["-y", "groundtruth-mcp"],
    env,
  }

  writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n")
  return configPath
}

function writeSkill(root: string) {
  const skillDir = join(root, ".claude", "skills", "groundtruth")
  mkdirSync(skillDir, { recursive: true })
  const skillPath = join(skillDir, "SKILL.md")
  writeFileSync(skillPath, SKILL_CONTENT)
  return skillPath
}

export async function runSetup() {
  p.intro("Ground Truth MCP — Setup")

  const keyChoice = await p.select({
    message: "Agent wallet",
    options: [
      { value: "generate", label: "Generate new wallet" },
      { value: "import", label: "Import existing private key" },
    ],
  })

  if (p.isCancel(keyChoice)) {
    p.cancel("Setup cancelled.")
    process.exit(0)
  }

  let privateKey: string

  if (keyChoice === "import") {
    const imported = await p.text({
      message: "Private key (0x...)",
      validate: (v = "") => {
        if (!v.startsWith("0x")) return "Must start with 0x"
        if (v.length !== 66) return "Must be 64 hex characters (with 0x prefix)"
      },
    })
    if (p.isCancel(imported)) {
      p.cancel("Setup cancelled.")
      process.exit(0)
    }
    privateKey = imported
  } else {
    privateKey = generatePrivateKey()
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`)
  const address = getAddress(account.address)

  p.log.success(`Wallet: ${address}`)
  p.log.warning(`Private key: ${privateKey}`)
  p.log.message("Save this — it won't be shown again.")

  const apiUrl = await p.text({
    message: "Ground Truth API URL",
    defaultValue: "https://groundtruth.grm.wtf",
    placeholder: "https://groundtruth.grm.wtf",
  })

  if (p.isCancel(apiUrl)) {
    p.cancel("Setup cancelled.")
    process.exit(0)
  }

  // --- Optional Geo (GRC-20 / GeoBrowser) publishing ---
  let geoPrivateKey: string | undefined
  let geoSpaceId: string | undefined
  let geoAddress: string | undefined

  const enableGeo = await p.confirm({
    message: "Enable Geo publishing? (mirror events to a GRC-20 Space on geobrowser.io)",
    initialValue: false,
  })

  if (p.isCancel(enableGeo)) {
    p.cancel("Setup cancelled.")
    process.exit(0)
  }

  if (enableGeo) {
    const geoKeyChoice = await p.select({
      message: "Geo wallet (separate from agent wallet)",
      options: [
        { value: "generate", label: "Generate new Geo wallet" },
        { value: "import", label: "Import existing Geo private key" },
      ],
    })

    if (p.isCancel(geoKeyChoice)) {
      p.cancel("Setup cancelled.")
      process.exit(0)
    }

    if (geoKeyChoice === "import") {
      const imported = await p.text({
        message: "Geo private key (0x...)",
        validate: (v = "") => {
          if (!v.startsWith("0x")) return "Must start with 0x"
          if (v.length !== 66) return "Must be 64 hex characters (with 0x prefix)"
        },
      })
      if (p.isCancel(imported)) {
        p.cancel("Setup cancelled.")
        process.exit(0)
      }
      geoPrivateKey = imported
    } else {
      geoPrivateKey = generatePrivateKey()
    }

    const geoAccount = privateKeyToAccount(geoPrivateKey as `0x${string}`)
    geoAddress = getAddress(geoAccount.address)
    p.log.success(`Geo wallet: ${geoAddress}`)
    p.log.warning(`Geo private key: ${geoPrivateKey}`)
    p.log.message("Save this — it won't be shown again.")

    const existingSpaceId = await p.text({
      message: "Existing Geo Space ID? (leave blank if you don't have one yet)",
      placeholder: "(blank)",
      defaultValue: "",
    })

    if (p.isCancel(existingSpaceId)) {
      p.cancel("Setup cancelled.")
      process.exit(0)
    }

    if (existingSpaceId && existingSpaceId.trim().length > 0) {
      geoSpaceId = existingSpaceId.trim()
    }
  }

  const root = findProjectRoot()

  const mcpPath = writeMcpConfig(
    root,
    privateKey,
    apiUrl,
    geoPrivateKey ? { privateKey: geoPrivateKey, spaceId: geoSpaceId } : undefined,
  )
  p.log.success(`Wrote ${mcpPath}`)

  const skillPath = writeSkill(root)
  p.log.success(`Wrote ${skillPath}`)

  const nextSteps = [
    `1. (Optional) Register with AgentBook for a verification badge:`,
    `   npx @worldcoin/agentkit-cli register ${address}`,
    ``,
    `2. Link wallet on Ground Truth:`,
    `   Open app -> Profile -> Agents -> paste ${address}`,
    ``,
    `3. Register ENS Identity (for on-chain verification):`,
    `   Profile -> Agents -> Register ENS Identity`,
  ]

  if (enableGeo && geoAddress) {
    nextSteps.push(``)
    nextSteps.push(`4. Fund your Geo wallet with testnet ETH on chain 19411:`)
    nextSteps.push(`   Wallet: ${geoAddress}`)
    nextSteps.push(`   (Ask in https://discord.gg/geoprotocol for the Geo testnet faucet)`)
    if (!geoSpaceId) {
      nextSteps.push(``)
      nextSteps.push(`5. Deploy a personal Geo Space (after funding):`)
      nextSteps.push(`   GEO_PRIVATE_KEY=${geoPrivateKey} bun run scripts/bootstrap-geo.ts`)
      nextSteps.push(`   Then add the printed GEO_SPACE_ID to ${mcpPath}`)
    }
  }

  p.note(nextSteps.join("\n"), "Next steps")

  // Open browser to link the wallet
  const linkUrl = `${apiUrl}?link-agent=${address}`
  const openCmd = platform() === "darwin" ? "open" : platform() === "win32" ? "start" : "xdg-open"
  exec(`${openCmd} "${linkUrl}"`)

  p.outro("Done! Opening Ground Truth to link your wallet...")
}
