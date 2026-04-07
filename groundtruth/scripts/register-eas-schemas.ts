#!/usr/bin/env bun
/**
 * Register Ground Truth's canonical EAS schemas to SchemaRegistry.
 *
 * Usage:
 *   bun scripts/register-eas-schemas.ts --chain sepolia        # free dry run
 *   bun scripts/register-eas-schemas.ts --chain mainnet --print # print payloads for manual exec
 *
 * Sepolia mode:
 *   - Requires EAS_REGISTRATION_KEY env var (testnet private key).
 *   - Registers all 4 schemas directly via the private key.
 *   - Verifies that the on-chain computed UID matches our local UID.
 *
 * Mainnet mode (--print):
 *   - NEVER uses a private key. Prints the four register() call payloads.
 *   - You execute them via Etherscan's "Write Contract" tab on the
 *     SchemaRegistry address from a personal wallet.
 *   - This keeps mainnet keys out of env files entirely.
 *
 * Because EAS schema UIDs are deterministic from (schemaString, resolver,
 * revocable), the Sepolia dry-run UIDs match the mainnet production UIDs
 * exactly. Run Sepolia first to sanity-check, then mainnet.
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  encodeFunctionData,
  type Address,
  type Hex,
} from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { mainnet, sepolia } from "viem/chains"
import {
  GROUND_TRUTH_SCHEMAS,
  SCHEMA_REGISTRY_ADDRESS,
  SEPOLIA_SCHEMA_REGISTRY_ADDRESS,
  ZERO_ADDRESS,
  schemaRegistryAbi,
} from "../src/lib/eas"

type Chain = "sepolia" | "mainnet"

function parseArgs(): { chain: Chain; print: boolean } {
  const args = process.argv.slice(2)
  const chainIdx = args.indexOf("--chain")
  if (chainIdx === -1) {
    throw new Error("Missing --chain flag (sepolia | mainnet)")
  }
  const chain = args[chainIdx + 1] as Chain
  if (chain !== "sepolia" && chain !== "mainnet") {
    throw new Error(`Invalid --chain value: ${chain}`)
  }
  return { chain, print: args.includes("--print") }
}

async function checkSchemaOnchain(
  client: ReturnType<typeof createPublicClient>,
  registry: Address,
  uid: Hex
): Promise<boolean> {
  try {
    const result = (await client.readContract({
      address: registry,
      abi: schemaRegistryAbi,
      functionName: "getSchema",
      args: [uid],
    })) as { uid: Hex }
    // If registered, returned uid equals our uid; otherwise it's zero bytes.
    return result.uid.toLowerCase() === uid.toLowerCase()
  } catch {
    return false
  }
}

async function main() {
  const { chain, print } = parseArgs()

  const registry =
    chain === "mainnet"
      ? SCHEMA_REGISTRY_ADDRESS
      : SEPOLIA_SCHEMA_REGISTRY_ADDRESS
  const viemChain = chain === "mainnet" ? mainnet : sepolia

  console.log(`\n=== Ground Truth EAS Schema Registration ===`)
  console.log(`Chain:    ${chain}`)
  console.log(`Registry: ${registry}`)
  console.log(`Schemas:  ${GROUND_TRUTH_SCHEMAS.length}\n`)

  for (const schema of GROUND_TRUTH_SCHEMAS) {
    console.log(`--- ${schema.name} ---`)
    console.log(`  schema:    ${schema.schema}`)
    console.log(`  resolver:  ${schema.resolver}`)
    console.log(`  revocable: ${schema.revocable}`)
    console.log(`  local uid: ${schema.uid}`)
  }
  console.log()

  if (chain === "mainnet" && print) {
    // --print mode: output call payloads, DO NOT send any transactions.
    console.log(`=== Mainnet register() payloads (execute via Etherscan) ===\n`)
    for (const schema of GROUND_TRUTH_SCHEMAS) {
      const data = encodeFunctionData({
        abi: schemaRegistryAbi,
        functionName: "register",
        args: [schema.schema, schema.resolver, schema.revocable],
      })
      console.log(`# ${schema.name}`)
      console.log(`  To:       ${registry}`)
      console.log(`  Function: register(string,address,bool)`)
      console.log(`  schema:    ${schema.schema}`)
      console.log(`  resolver:  ${schema.resolver}`)
      console.log(`  revocable: ${schema.revocable}`)
      console.log(`  Calldata: ${data}\n`)
    }
    console.log(
      `Open https://etherscan.io/address/${registry}#writeContract and call register() with these args.\n`
    )
    return
  }

  if (chain === "mainnet" && !print) {
    throw new Error(
      "Mainnet requires --print (we never put a mainnet key in env). Re-run with --chain mainnet --print"
    )
  }

  // Sepolia path: actually submit txs.
  const privateKey = process.env.EAS_REGISTRATION_KEY
  if (!privateKey) {
    throw new Error("EAS_REGISTRATION_KEY env var required for sepolia")
  }
  const account = privateKeyToAccount(
    privateKey.startsWith("0x")
      ? (privateKey as Hex)
      : (`0x${privateKey}` as Hex)
  )
  console.log(`Signer: ${account.address}`)

  const publicClient = createPublicClient({
    chain: viemChain,
    transport: http(),
  })
  const walletClient = createWalletClient({
    account,
    chain: viemChain,
    transport: http(),
  })

  const results: {
    name: string
    localUid: Hex
    status: "already-registered" | "registered"
    txHash?: Hex
  }[] = []

  for (const schema of GROUND_TRUTH_SCHEMAS) {
    console.log(`\n→ ${schema.name}`)
    const already = await checkSchemaOnchain(publicClient, registry, schema.uid)
    if (already) {
      console.log(`  already registered, skipping`)
      results.push({ name: schema.name, localUid: schema.uid, status: "already-registered" })
      continue
    }
    console.log(`  registering...`)
    const txHash = await walletClient.writeContract({
      address: registry,
      abi: schemaRegistryAbi,
      functionName: "register",
      args: [schema.schema, ZERO_ADDRESS, schema.revocable],
    })
    console.log(`  tx: ${txHash}`)
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
    console.log(`  mined in block ${receipt.blockNumber}`)

    // Verify on-chain UID matches local computation.
    const check = await checkSchemaOnchain(publicClient, registry, schema.uid)
    if (!check) {
      throw new Error(
        `UID mismatch for ${schema.name}: registry does not contain our computed UID ${schema.uid}`
      )
    }
    results.push({
      name: schema.name,
      localUid: schema.uid,
      status: "registered",
      txHash,
    })
  }

  console.log(`\n=== Summary ===`)
  for (const r of results) {
    console.log(
      `  ${r.name}: ${r.status}${r.txHash ? ` (${r.txHash})` : ""} uid=${r.localUid}`
    )
  }
  console.log()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
