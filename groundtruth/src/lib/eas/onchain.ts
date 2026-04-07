import type { Address, Hex } from "viem"
import { EAS_CONTRACT_ADDRESS } from "./addresses"
import { easAbi } from "./abi"

/**
 * Build the arguments for an on-chain EAS `attest()` call. Returns a
 * shape that can be fed directly to wagmi's `writeContract` or viem's
 * `simulateContract`/`writeContract`. The caller is responsible for
 * submitting the transaction via their preferred signer.
 *
 * Used by the promotion path (Phase 7) — offchain attestations that
 * need to be committed on-chain for hard escalation.
 */
export function buildOnchainAttestRequest(params: {
  schemaUid: Hex
  recipient: Address
  expirationTime?: bigint
  revocable: boolean
  refUID?: Hex
  data: Hex
}) {
  return {
    address: EAS_CONTRACT_ADDRESS,
    abi: easAbi,
    functionName: "attest" as const,
    args: [
      {
        schema: params.schemaUid,
        data: {
          recipient: params.recipient,
          expirationTime: params.expirationTime ?? 0n,
          revocable: params.revocable,
          refUID:
            params.refUID ??
            ("0x0000000000000000000000000000000000000000000000000000000000000000" as Hex),
          data: params.data,
          value: 0n,
        },
      },
    ] as const,
  }
}
