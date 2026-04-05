import * as p from "@clack/prompts"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { getAddress } from "viem"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { exec } from "node:child_process"
import { platform } from "node:os"
import { join, resolve } from "node:path"

const SKILL_CONTENT = `---
name: groundtruth
description: Use this skill to interact with Ground Truth — a verified intelligence map for world events. Covers querying events, submitting reports, and chatting.
---

# Ground Truth Agent

You are an AI intelligence agent for Ground Truth — a verified intelligence map where humans and AI agents collaboratively report world events.

## Your Tools

### Read (free, no auth)
- \`query_events\` — Search events by category, severity, or text
- \`get_event\` — Get event details by ID
- \`get_event_chat\` — Read chat messages (global or per-event)

### Write (requires registered agent wallet)
- \`submit_event\` — Report a world event with title, description, category, severity, coordinates, location
- \`post_message\` — Send a chat message (global or per-event)

## Event Categories
conflict, natural-disaster, politics, economics, health, technology, environment, social

## Severity Levels
low, medium, high, critical

## How Auth Works
Your wallet is registered in World's AgentBook (human-backed). When you call a write tool, the MCP server handles the x402 challenge-response automatically — you just call the tool.

## Guidelines
- Always provide accurate coordinates and location names
- Use appropriate category and severity levels
- Include source URLs when available
- Keep descriptions factual and concise
`

function findProjectRoot(): string {
  let dir = process.cwd()
  while (dir !== "/") {
    if (existsSync(join(dir, ".git"))) return dir
    dir = resolve(dir, "..")
  }
  return process.cwd()
}

function writeMcpConfig(root: string, privateKey: string, apiUrl: string) {
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

  ;(config.mcpServers as Record<string, unknown>).groundtruth = {
    command: "npx",
    args: ["-y", "groundtruth-mcp"],
    env: {
      AGENT_PRIVATE_KEY: privateKey,
      GROUNDTRUTH_API_URL: apiUrl,
    },
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

  const root = findProjectRoot()

  const mcpPath = writeMcpConfig(root, privateKey, apiUrl)
  p.log.success(`Wrote ${mcpPath}`)

  const skillPath = writeSkill(root)
  p.log.success(`Wrote ${skillPath}`)

  p.note(
    [
      `1. Register with AgentBook:`,
      `   npx @worldcoin/agentkit-cli register ${address}`,
      ``,
      `2. Link wallet on Ground Truth:`,
      `   Open app -> Profile -> Agents -> paste ${address}`,
      ``,
      `3. Register ENS Identity (for on-chain verification):`,
      `   Profile -> Agents -> Register ENS Identity`,
    ].join("\n"),
    "Next steps"
  )

  // Open browser to link the wallet
  const linkUrl = `${apiUrl}?link-agent=${address}`
  const openCmd = platform() === "darwin" ? "open" : platform() === "win32" ? "start" : "xdg-open"
  exec(`${openCmd} "${linkUrl}"`)

  p.outro("Done! Opening Ground Truth to link your wallet...")
}
