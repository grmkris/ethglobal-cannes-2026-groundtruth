import type { Address, Hex, TypedData, TypedDataDomain } from "viem"
import { EAS_DOMAIN, ZERO_ADDRESS, ZERO_BYTES32 } from "./addresses"
import { computeAttestationUid } from "./uid"
import type { GroundTruthSchema } from "./schemas"
import { encodeSchemaData } from "./encode"

/**
 * EIP-712 type definition for mainnet EAS v0.26 offchain Attest
 * signatures. This must match the on-chain domain separator so that
 * verifyTypedData works against a smart wallet (ERC-1271/6492).
 *
 * Note: mainnet EAS v0.26 does NOT include the `version` field that
 * later offchain versions (v1, v2) add. If we ever migrate to a newer
 * EAS deployment we will need to update these types.
 */
export const EAS_ATTEST_TYPES = {
  Attest: [
    { name: "schema", type: "bytes32" },
    { name: "recipient", type: "address" },
    { name: "time", type: "uint64" },
    { name: "expirationTime", type: "uint64" },
    { name: "revocable", type: "bool" },
    { name: "refUID", type: "bytes32" },
    { name: "data", type: "bytes" },
  ],
} as const satisfies TypedData

export interface BuildAttestationParams {
  schema: GroundTruthSchema
  data: Record<string, unknown>
  attester: Address
  recipient?: Address
  refUID?: Hex
  time?: bigint
  expirationTime?: bigint
}

export interface UnsignedAttestation {
  uid: Hex
  schemaUid: Hex
  recipient: Address
  attester: Address
  time: bigint
  expirationTime: bigint
  revocable: boolean
  refUID: Hex
  rawData: Hex
  schemaData: Record<string, unknown>
  domain: TypedDataDomain
  types: typeof EAS_ATTEST_TYPES
  primaryType: "Attest"
  message: {
    schema: Hex
    recipient: Address
    time: bigint
    expirationTime: bigint
    revocable: boolean
    refUID: Hex
    data: Hex
  }
}

/**
 * Build an unsigned EAS offchain attestation. The caller signs it with
 * viem.signTypedData (or wagmi.useSignTypedData) against the returned
 * `domain` + `types` + `message`. The `uid` is deterministic so the DB
 * row can be keyed by it before the signature comes back.
 */
export function buildOffchainAttestation(
  params: BuildAttestationParams
): UnsignedAttestation {
  const rawData = encodeSchemaData(params.schema, params.data)
  const now = BigInt(Math.floor(Date.now() / 1000))
  const time = params.time ?? now
  const expirationTime = params.expirationTime ?? 0n
  const recipient = params.recipient ?? ZERO_ADDRESS
  const refUID = params.refUID ?? ZERO_BYTES32

  const uid = computeAttestationUid({
    schemaUid: params.schema.uid,
    recipient,
    attester: params.attester,
    time,
    expirationTime,
    revocable: params.schema.revocable,
    refUID,
    data: rawData,
  })

  return {
    uid,
    schemaUid: params.schema.uid,
    recipient,
    attester: params.attester,
    time,
    expirationTime,
    revocable: params.schema.revocable,
    refUID,
    rawData,
    schemaData: params.data,
    domain: EAS_DOMAIN,
    types: EAS_ATTEST_TYPES,
    primaryType: "Attest" as const,
    message: {
      schema: params.schema.uid,
      recipient,
      time,
      expirationTime,
      revocable: params.schema.revocable,
      refUID,
      data: rawData,
    },
  }
}
