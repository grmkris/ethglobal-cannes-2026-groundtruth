import { keccak256, encodePacked, type Address, type Hex } from "viem"

/**
 * Compute the canonical EAS attestation UID. Matches the on-chain EAS
 * contract's UID derivation so that an offchain attestation can be
 * promoted to onchain with the same UID.
 *
 * Formula (from eas-contracts):
 *   keccak256(abi.encodePacked(
 *     schemaUid, recipient, attester, time, expirationTime,
 *     revocable, refUID, data, bump
 *   ))
 *
 * `bump` is a counter for deduping identical attestations submitted in
 * the same block. Offchain attestations always use bump=0 since our DB
 * primary key would catch duplicates before re-signing.
 */
export function computeAttestationUid(params: {
  schemaUid: Hex
  recipient: Address
  attester: Address
  time: bigint
  expirationTime: bigint
  revocable: boolean
  refUID: Hex
  data: Hex
  bump?: number
}): Hex {
  return keccak256(
    encodePacked(
      [
        "bytes32",
        "address",
        "address",
        "uint64",
        "uint64",
        "bool",
        "bytes32",
        "bytes",
        "uint32",
      ],
      [
        params.schemaUid,
        params.recipient,
        params.attester,
        params.time,
        params.expirationTime,
        params.revocable,
        params.refUID,
        params.data,
        params.bump ?? 0,
      ]
    )
  )
}
