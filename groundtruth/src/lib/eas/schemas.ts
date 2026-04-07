import { keccak256, encodePacked, type Address, type Hex } from "viem"
import { ZERO_ADDRESS } from "./addresses"

/**
 * Ground Truth's canonical EAS schemas. Once registered on SchemaRegistry
 * these UIDs are permanent. The UIDs are deterministic from the triple
 * (schema string, resolver address, revocable flag), so we compute them
 * at module load time rather than relying on a post-registration step.
 *
 * All schemas use the zero address as resolver (no custom validation
 * contract). Revocability is per-schema.
 */

export type GroundTruthSchemaName =
  | "GroundTruthCorroboration"
  | "GroundTruthDispute"
  | "GroundTruthSourceClaim"
  | "GroundTruthAgentMandate"

export interface GroundTruthSchema {
  name: GroundTruthSchemaName
  schema: string
  resolver: Address
  revocable: boolean
  uid: Hex
  /**
   * ABI type list corresponding to the schema string, used by encode.ts
   * via viem.encodeAbiParameters. Must stay in sync with `schema`.
   */
  abiTypes: readonly { readonly name: string; readonly type: string }[]
}

function computeSchemaUid(
  schema: string,
  resolver: Address,
  revocable: boolean
): Hex {
  return keccak256(
    encodePacked(
      ["string", "address", "bool"],
      [schema, resolver, revocable]
    )
  )
}

function defineSchema(
  name: GroundTruthSchemaName,
  schema: string,
  abiTypes: readonly { readonly name: string; readonly type: string }[],
  revocable: boolean
): GroundTruthSchema {
  return {
    name,
    schema,
    resolver: ZERO_ADDRESS,
    revocable,
    uid: computeSchemaUid(schema, ZERO_ADDRESS, revocable),
    abiTypes,
  }
}

// --- 1. GroundTruthCorroboration ---
// "I observed this event. Here's when, where, and my source."
export const CORROBORATION_SCHEMA = defineSchema(
  "GroundTruthCorroboration",
  "string canonicalEventId,bytes32 observationHash,uint64 observedAt,string sourceURI,int32 latE6,int32 lonE6",
  [
    { name: "canonicalEventId", type: "string" },
    { name: "observationHash", type: "bytes32" },
    { name: "observedAt", type: "uint64" },
    { name: "sourceURI", type: "string" },
    { name: "latE6", type: "int32" },
    { name: "lonE6", type: "int32" },
  ] as const,
  false // not revocable — corroborations are append-only
)

// --- 2. GroundTruthDispute ---
// "I'm disputing this event, here's why, here's my evidence."
export const DISPUTE_SCHEMA = defineSchema(
  "GroundTruthDispute",
  "string eventId,uint8 reasonCode,string justification,string evidenceURI,bytes32 justificationHash",
  [
    { name: "eventId", type: "string" },
    { name: "reasonCode", type: "uint8" },
    { name: "justification", type: "string" },
    { name: "evidenceURI", type: "string" },
    { name: "justificationHash", type: "bytes32" },
  ] as const,
  true // revocable — users can withdraw a dispute
)

// --- 3. GroundTruthSourceClaim ---
// External sources attest their publication of an event's source URI.
// Reserved in v1, not yet wired.
export const SOURCE_CLAIM_SCHEMA = defineSchema(
  "GroundTruthSourceClaim",
  "string eventId,string sourceURI,uint64 publishedAt,uint8 sourceType",
  [
    { name: "eventId", type: "string" },
    { name: "sourceURI", type: "string" },
    { name: "publishedAt", type: "uint64" },
    { name: "sourceType", type: "uint8" },
  ] as const,
  true
)

// --- 4. GroundTruthAgentMandate ---
// Human owner declares an agent's capabilities. Complements ERC-8004 identity.
// Reserved in v1, not yet wired.
export const AGENT_MANDATE_SCHEMA = defineSchema(
  "GroundTruthAgentMandate",
  "address agentWallet,uint256 erc8004AgentId,string mandate,string sources",
  [
    { name: "agentWallet", type: "address" },
    { name: "erc8004AgentId", type: "uint256" },
    { name: "mandate", type: "string" },
    { name: "sources", type: "string" },
  ] as const,
  true
)

export const GROUND_TRUTH_SCHEMAS = [
  CORROBORATION_SCHEMA,
  DISPUTE_SCHEMA,
  SOURCE_CLAIM_SCHEMA,
  AGENT_MANDATE_SCHEMA,
] as const

export function getSchemaByName(name: GroundTruthSchemaName): GroundTruthSchema {
  const schema = GROUND_TRUTH_SCHEMAS.find((s) => s.name === name)
  if (!schema) throw new Error(`Unknown schema: ${name}`)
  return schema
}

export function getSchemaByUid(uid: Hex): GroundTruthSchema | undefined {
  return GROUND_TRUTH_SCHEMAS.find(
    (s) => s.uid.toLowerCase() === uid.toLowerCase()
  )
}

// Dispute reason codes. Must match event.db DISPUTE_VALUES enum ordering
// but encoded as uint8 for the EAS schema.
export const DISPUTE_REASON_CODES = {
  inaccurate: 1,
  misleading: 2,
  fabricated: 3,
} as const

export type DisputeReasonCode =
  (typeof DISPUTE_REASON_CODES)[keyof typeof DISPUTE_REASON_CODES]
