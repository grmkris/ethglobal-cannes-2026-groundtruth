// Publishes Ground Truth events to a GRC-20 Space on Geo testnet (TESTNET_V2).
//
// Flow (uses @graphprotocol/grc-20 v0.33.0):
//   1. Graph.createEntity({ name, types, values }) → { id, ops }
//   2. Ipfs.publishEdit({ name, ops, author, network: "TESTNET_V2" }) → { cid }
//   3. Encoding.getEditCalldata({ spaceId, cid, network: "TESTNET_V2" }) → { to, data }
//   4. wallet.sendTransaction({ to, data, value: 0n }) → tx hash
//
// The publish IS an onchain tx that requires gas (testnet ETH on chain 19411).

import {
  Encoding,
  Graph,
  Ipfs,
  getChecksumAddress,
} from "@graphprotocol/grc-20"
import type { Hex } from "viem"
import { createWalletClient, http } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import {
  GEO_CHAIN_ID,
  GEO_CHAIN_NAME,
  GEO_NETWORK,
  GEO_RPC_DEFAULT,
  PROPERTY_IDS,
  WORLD_EVENT_TYPE_ID,
  isGeoSchemaBootstrapped,
} from "./geo-constants.js"

// --- Types matching the Ground Truth event payload from the API ---

export type GroundTruthEvent = {
  id: string
  title: string
  description?: string | null
  category: string
  severity: string
  latitude: number
  longitude: number
  location?: string | null
  source?: string | null
  occurredAt?: string | null
  imageUrls?: string[] | null
  // Trust-stack bridge fields (optional — populated when the event has them)
  erc8004AgentId?: string | null
  attestationUid?: string | null
  worldIdVerified?: boolean | null
}

export type PublishResult = {
  cid: string
  txHash: Hex
  spaceId: string
  network: typeof GEO_NETWORK
  geoEntityId: string
}

// --- Public API ---

/**
 * Deploy a personal Geo Space owned by `privateKey`.
 * Single REST call — no signing, no testnet ETH needed.
 */
export async function deployPersonalSpace(opts: {
  privateKey: Hex
  spaceName: string
}): Promise<{ spaceId: string }> {
  const account = privateKeyToAccount(opts.privateKey)
  const { id } = await Graph.createSpace({
    editorAddress: getChecksumAddress(account.address),
    name: opts.spaceName,
    network: GEO_NETWORK,
    governanceType: "PERSONAL",
  })
  return { spaceId: id as unknown as string }
}

/**
 * Publish a Ground Truth event to a GRC-20 Space as a single Edit.
 * Returns the IPFS CID and onchain tx hash.
 *
 * Requires the wallet at `privateKey` to be funded with testnet ETH on chain 19411.
 */
export async function publishEventToGeo(opts: {
  event: GroundTruthEvent
  spaceId: string
  privateKey: Hex
  rpc?: string
}): Promise<PublishResult> {
  if (!isGeoSchemaBootstrapped()) {
    throw new Error(
      "Geo schema not bootstrapped — run `bun run scripts/bootstrap-geo.ts` first to generate property/type IDs.",
    )
  }

  const { event, spaceId, privateKey } = opts
  const rpc = opts.rpc ?? GEO_RPC_DEFAULT
  const account = privateKeyToAccount(privateKey)
  const author = getChecksumAddress(account.address)

  // --- Build entity values ---
  // POINT uses structured fields { lon, lat } per the v0.33.0 TypedValue spec.
  // The geographer convention is (lat, lng) but PostGIS / WGS84 spatial DBs
  // use (lng, lat). The SDK uses lon/lat fields explicitly so order is unambiguous.
  const values: Array<{ property: string } & Record<string, unknown>> = [
    {
      property: PROPERTY_IDS.point,
      type: "point",
      lon: event.longitude,
      lat: event.latitude,
    },
    {
      property: PROPERTY_IDS.category,
      type: "text",
      value: event.category,
    },
    {
      property: PROPERTY_IDS.severity,
      type: "text",
      value: event.severity,
    },
  ]

  if (event.occurredAt) {
    values.push({
      property: PROPERTY_IDS.occurredAt,
      type: "datetime",
      value: event.occurredAt,
    })
  }

  if (event.source) {
    values.push({
      property: PROPERTY_IDS.source,
      type: "text",
      value: event.source,
    })
  }

  if (event.location) {
    values.push({
      property: PROPERTY_IDS.locationName,
      type: "text",
      value: event.location,
    })
  }

  // Trust-stack bridge values
  if (event.erc8004AgentId) {
    values.push({
      property: PROPERTY_IDS.agentId,
      type: "text",
      value: event.erc8004AgentId,
    })
  }

  if (event.attestationUid) {
    values.push({
      property: PROPERTY_IDS.attestationUid,
      type: "text",
      value: event.attestationUid,
    })
  }

  if (typeof event.worldIdVerified === "boolean") {
    values.push({
      property: PROPERTY_IDS.worldIdVerified,
      type: "bool",
      value: event.worldIdVerified,
    })
  }

  // --- Create entity (locally generates ops) ---
  const { id: geoEntityId, ops } = Graph.createEntity({
    name: event.title,
    description: event.description ?? undefined,
    types: [WORLD_EVENT_TYPE_ID],
    // biome-ignore lint/suspicious/noExplicitAny: TypedValue discriminated union
    values: values as any,
  })

  // --- Publish to IPFS ---
  const { cid } = await Ipfs.publishEdit({
    name: `Ground Truth event: ${event.title.slice(0, 60)}`,
    ops,
    author: author as `0x${string}`,
    network: GEO_NETWORK,
  })

  // --- Get calldata via SDK helper ---
  const { to, data } = await Encoding.getEditCalldata({
    spaceId,
    cid,
    network: GEO_NETWORK,
  })

  // --- Send tx via viem ---
  const wallet = createWalletClient({
    account,
    chain: {
      id: GEO_CHAIN_ID,
      name: GEO_CHAIN_NAME,
      nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
      rpcUrls: {
        default: { http: [rpc] },
        public: { http: [rpc] },
      },
    },
    transport: http(rpc),
  })

  const txHash = await wallet.sendTransaction({
    to,
    value: 0n,
    data,
  })

  return {
    cid,
    txHash,
    spaceId,
    network: GEO_NETWORK,
    geoEntityId: geoEntityId as unknown as string,
  }
}
