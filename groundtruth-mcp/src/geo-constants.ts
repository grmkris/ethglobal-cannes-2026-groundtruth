// Frozen GRC-20 Property and Type IDs for the Ground Truth schema.
//
// To regenerate:
//   1. Set GEO_PRIVATE_KEY env var (used only to derive editor address —
//      no signing, no testnet ETH required)
//   2. Run `bun run scripts/bootstrap-geo.ts` from groundtruth-mcp/
//   3. Bootstrap script auto-rewrites this file with real IDs

// --- Network ---
//
// TESTNET_V2 routes to https://testnet-api.geobrowser.io which is the live
// indexer endpoint we verified (returns real entity data). The older
// "TESTNET" enum routes to api-testnet.geobrowser.io which is the legacy
// endpoint. Use TESTNET_V2.
export const GEO_NETWORK = "TESTNET_V2" as const
export const GEO_CHAIN_ID = 19411
export const GEO_CHAIN_NAME = "Geo Testnet"
export const GEO_RPC_DEFAULT = "https://rpc-geo-test-zc16z3tcvf.t.conduit.xyz"

// --- Endpoints ---
// (All other endpoints — deploy, calldata builder — are handled by the SDK
// internally via getApiOrigin(network). We only hard-code the GraphQL read
// endpoint since the SDK doesn't expose a query helper.)
export const GEO_GRAPHQL_ENDPOINT = "https://testnet-api.geobrowser.io/graphql"

// --- Bootstrap placeholder marker ---
// String typing (not literal) so runtime checks against this value compile cleanly.
export const BOOTSTRAP_PLACEHOLDER: string = "TODO_RUN_BOOTSTRAP"

// --- Property IDs (filled in by bootstrap script) ---
// Note: title and description are NOT custom properties — they're handled by
// the SDK via Graph.createEntity({ name, description }) which uses
// SystemIds.NAME_PROPERTY and SystemIds.DESCRIPTION_PROPERTY automatically.
export const POINT_PROPERTY_ID: string = "TODO_RUN_BOOTSTRAP"
export const OCCURRED_AT_PROPERTY_ID: string = "TODO_RUN_BOOTSTRAP"
export const SOURCE_PROPERTY_ID: string = "TODO_RUN_BOOTSTRAP"
export const CATEGORY_PROPERTY_ID: string = "TODO_RUN_BOOTSTRAP"
export const SEVERITY_PROPERTY_ID: string = "TODO_RUN_BOOTSTRAP"
export const LOCATION_NAME_PROPERTY_ID: string = "TODO_RUN_BOOTSTRAP"

// --- Type IDs (filled in by bootstrap script) ---
export const WORLD_EVENT_TYPE_ID: string = "TODO_RUN_BOOTSTRAP"

// --- Helpers ---

/**
 * Returns true once the bootstrap script has rewritten this file with real IDs.
 * Use to gate Geo features at runtime.
 */
export function isGeoSchemaBootstrapped(): boolean {
  return POINT_PROPERTY_ID !== BOOTSTRAP_PLACEHOLDER
}

/**
 * All custom property IDs as a readonly map keyed by the Ground Truth event field name.
 * Used by both the publisher (writes) and reader (decodes valuesList by propertyId).
 */
export const PROPERTY_IDS = {
  point: POINT_PROPERTY_ID,
  occurredAt: OCCURRED_AT_PROPERTY_ID,
  source: SOURCE_PROPERTY_ID,
  category: CATEGORY_PROPERTY_ID,
  severity: SEVERITY_PROPERTY_ID,
  locationName: LOCATION_NAME_PROPERTY_ID,
} as const

export type PropertyKey = keyof typeof PROPERTY_IDS
