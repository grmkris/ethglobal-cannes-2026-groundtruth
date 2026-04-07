import type { Address, Hex } from "viem"
import { verifyTypedData } from "viem/actions"
import { mainnetClient } from "@/lib/chain-clients"
import { EAS_DOMAIN } from "./addresses"
import { EAS_ATTEST_TYPES } from "./offchain"

export interface VerifyOffchainAttestationParams {
  attester: Address
  signature: Hex
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
 * Verify an offchain EAS attestation signature against mainnet via the
 * shared Reown-RPC client. Smart-wallet aware: uses viem's verifyTypedData
 * action which handles both ECDSA (EOA) and ERC-1271/ERC-6492 (smart
 * contract wallets like Reown's counterfactual Safes).
 *
 * This is the single strongest reason we roll our own EAS wrapper instead
 * of using @ethereum-attestation-service/eas-sdk — the upstream SDK uses
 * ecrecover which breaks for smart contract wallets.
 */
export async function verifyOffchainAttestation(
  params: VerifyOffchainAttestationParams
): Promise<boolean> {
  try {
    return await verifyTypedData(mainnetClient, {
      address: params.attester,
      domain: EAS_DOMAIN,
      types: EAS_ATTEST_TYPES,
      primaryType: "Attest",
      message: params.message,
      signature: params.signature,
    })
  } catch (err) {
    console.error("[eas] verifyOffchainAttestation threw", err)
    return false
  }
}
