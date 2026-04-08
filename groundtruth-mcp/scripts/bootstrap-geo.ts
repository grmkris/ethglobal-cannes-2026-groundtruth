#!/usr/bin/env bun
//
// One-time owner script: deploy a Geo Space WITH the canonical Ground Truth
// WorldEvent schema (properties + type) as initial ops in a single REST call.
//
// Usage:
//   export GEO_PRIVATE_KEY=0x...   # used only to derive editor address
//   bun run scripts/bootstrap-geo.ts
//
// Output:
//   - Prints SPACE_ID + all generated property/type IDs
//   - Auto-rewrites src/geo-constants.ts with the real IDs
//
// IMPORTANT: This script does NOT need testnet ETH. The Geo deploy endpoint
// accepts the schema ops as part of the deploy payload — no onchain tx, no
// signing, no gas. We only need the editor address (derived from the private
// key) to attribute the Space to the right wallet for future publishing.
//
// After running:
//   1. Commit src/geo-constants.ts
//   2. Bump package.json version (e.g. 0.1.0)
//   3. (Optional) npm publish

import { Graph, type Op } from "@graphprotocol/grc-20"
import { privateKeyToAccount } from "viem/accounts"
import { readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const GEO_NETWORK = "TESTNET_V2" as const
const SPACE_NAME = "Ground Truth — World Events"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function main() {
  const pk = process.env.GEO_PRIVATE_KEY
  if (!pk || !pk.startsWith("0x") || pk.length !== 66) {
    console.error("ERROR: set GEO_PRIVATE_KEY=0x... (64 hex chars + 0x prefix) in env")
    process.exit(1)
  }

  const account = privateKeyToAccount(pk as `0x${string}`)
  const editorAddress = account.address

  console.log("")
  console.log("Ground Truth Geo Bootstrap")
  console.log("==========================")
  console.log(`Editor:  ${editorAddress}`)
  console.log(`Network: ${GEO_NETWORK}`)
  console.log("")
  console.log("This script will:")
  console.log("  1. Generate property ops (point, datetime, source, category, severity, locationName)")
  console.log("  2. Generate WorldEvent type op")
  console.log("  3. Deploy a personal Space with all ops as initial content (one REST call)")
  console.log("  4. Auto-rewrite src/geo-constants.ts")
  console.log("")
  console.log("No onchain tx. No testnet ETH needed.")
  console.log("")

  // --- Step 1: Generate property ops ---
  console.log("→ Generating property ops...")
  const ops: Op[] = []

  const { id: pointId, ops: pointOps } = Graph.createProperty({
    dataType: "POINT",
    name: "Location",
    description: "WGS84 geographic coordinate (longitude, latitude)",
  })
  ops.push(...pointOps)

  const { id: occurredAtId, ops: occurredAtOps } = Graph.createProperty({
    dataType: "DATETIME",
    name: "Occurred At",
    description: "ISO 8601 timestamp when the event occurred",
  })
  ops.push(...occurredAtOps)

  const { id: sourceId, ops: sourceOps } = Graph.createProperty({
    dataType: "TEXT",
    name: "Source",
    description: "Source URL or attribution for the event report",
  })
  ops.push(...sourceOps)

  const { id: categoryId, ops: categoryOps } = Graph.createProperty({
    dataType: "TEXT",
    name: "Category",
    description: "Event category (conflict, natural-disaster, politics, economics, health, technology, environment, social)",
  })
  ops.push(...categoryOps)

  const { id: severityId, ops: severityOps } = Graph.createProperty({
    dataType: "TEXT",
    name: "Severity",
    description: "Event severity level (low, medium, high, critical)",
  })
  ops.push(...severityOps)

  const { id: locationNameId, ops: locationNameOps } = Graph.createProperty({
    dataType: "TEXT",
    name: "Location Name",
    description: "Human-readable location name (city, region, country)",
  })
  ops.push(...locationNameOps)

  // Trust-stack bridge properties
  const { id: agentIdId, ops: agentIdOps } = Graph.createProperty({
    dataType: "TEXT",
    name: "Agent ID",
    description: "ERC-8004 NFT token id of the publishing agent on Ethereum mainnet (empty if human-reported)",
  })
  ops.push(...agentIdOps)

  const { id: attestationUidId, ops: attestationUidOps } = Graph.createProperty({
    dataType: "TEXT",
    name: "Attestation UID",
    description: "EAS GroundTruthSourceClaim attestation UID (mainnet) — empty if not yet attested",
  })
  ops.push(...attestationUidOps)

  const { id: worldIdVerifiedId, ops: worldIdVerifiedOps } = Graph.createProperty({
    dataType: "CHECKBOX",
    name: "World ID Verified",
    description: "True if the reporter completed World ID 4.0 proof of personhood",
  })
  ops.push(...worldIdVerifiedOps)

  console.log(`✓ ${ops.length} property ops generated`)
  console.log("")

  // --- Step 2: Generate WorldEvent type op ---
  console.log("→ Generating WorldEvent type op...")
  const { id: worldEventTypeId, ops: typeOps } = Graph.createType({
    name: "World Event",
    description: "A geolocated event reported on Ground Truth — verified intelligence with category, severity, source, and time.",
    properties: [
      pointId,
      occurredAtId,
      sourceId,
      categoryId,
      severityId,
      locationNameId,
      agentIdId,
      attestationUidId,
      worldIdVerifiedId,
    ],
  })
  ops.push(...typeOps)
  console.log(`✓ Type op added (total ops: ${ops.length})`)
  console.log("")

  // --- Step 3: Deploy Space with initial ops ---
  console.log("→ Deploying Space (single REST call)...")
  const { id: spaceId } = await Graph.createSpace({
    editorAddress,
    name: SPACE_NAME,
    network: GEO_NETWORK,
    governanceType: "PERSONAL",
    ops,
  })
  console.log(`✓ Space deployed: ${spaceId}`)
  console.log("")

  // --- Step 4: Print results ---
  console.log("=".repeat(60))
  console.log("BOOTSTRAP COMPLETE")
  console.log("=".repeat(60))
  console.log("")
  console.log(`Team SPACE_ID:               ${spaceId}`)
  console.log(`(store in your local .env as GEO_SPACE_ID — not committed)`)
  console.log("")
  console.log(`POINT_PROPERTY_ID:           ${pointId}`)
  console.log(`OCCURRED_AT_PROPERTY_ID:     ${occurredAtId}`)
  console.log(`SOURCE_PROPERTY_ID:          ${sourceId}`)
  console.log(`CATEGORY_PROPERTY_ID:        ${categoryId}`)
  console.log(`SEVERITY_PROPERTY_ID:        ${severityId}`)
  console.log(`LOCATION_NAME_PROPERTY_ID:   ${locationNameId}`)
  console.log(`AGENT_ID_PROPERTY_ID:        ${agentIdId}`)
  console.log(`ATTESTATION_UID_PROPERTY_ID: ${attestationUidId}`)
  console.log(`WORLD_ID_VERIFIED_PROPERTY_ID: ${worldIdVerifiedId}`)
  console.log(`WORLD_EVENT_TYPE_ID:         ${worldEventTypeId}`)
  console.log("")

  // --- Step 5: Auto-rewrite src/geo-constants.ts ---
  const constantsPath = resolve(__dirname, "..", "src", "geo-constants.ts")
  console.log(`→ Rewriting ${constantsPath}...`)

  let content = readFileSync(constantsPath, "utf-8")

  const replacements: Array<[string, string]> = [
    ["POINT_PROPERTY_ID", pointId],
    ["OCCURRED_AT_PROPERTY_ID", occurredAtId],
    ["SOURCE_PROPERTY_ID", sourceId],
    ["CATEGORY_PROPERTY_ID", categoryId],
    ["SEVERITY_PROPERTY_ID", severityId],
    ["LOCATION_NAME_PROPERTY_ID", locationNameId],
    ["AGENT_ID_PROPERTY_ID", agentIdId],
    ["ATTESTATION_UID_PROPERTY_ID", attestationUidId],
    ["WORLD_ID_VERIFIED_PROPERTY_ID", worldIdVerifiedId],
    ["WORLD_EVENT_TYPE_ID", worldEventTypeId],
  ]

  for (const [name, id] of replacements) {
    const re = new RegExp(`export const ${name}: string = "[^"]*"`)
    if (!re.test(content)) {
      console.warn(`  ! Could not find ${name} declaration to replace`)
      continue
    }
    content = content.replace(re, `export const ${name}: string = "${id}"`)
  }

  writeFileSync(constantsPath, content)
  console.log("✓ geo-constants.ts updated")
  console.log("")
  console.log("Next steps:")
  console.log("  1. Review the diff: git diff src/geo-constants.ts")
  console.log("  2. Commit: git add src/geo-constants.ts && git commit")
  console.log(`  3. Set GEO_SPACE_ID=${spaceId} in your local .env / .mcp.json`)
  console.log("  4. Test with `bun run start` (with GEO_SPACE_ID + GEO_PRIVATE_KEY in env)")
  console.log("")
  console.log("To publish events to this Space at runtime, the wallet WILL need")
  console.log("testnet ETH (gas for the publishEdits onchain tx). Ask in")
  console.log("https://discord.gg/geoprotocol for the Geo testnet faucet.")
  console.log("")
}

main().catch((err) => {
  console.error("\nBootstrap failed:", err)
  process.exit(1)
})
