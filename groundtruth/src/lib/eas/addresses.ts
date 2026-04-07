import type { Address } from "viem"

// --- Ethereum Mainnet (production) ---
// Deployed at EAS v0.26 — https://docs.attest.org/docs/quick--start/contracts
export const EAS_CONTRACT_ADDRESS: Address =
  "0xA1207F3BBa224E2c9c3c6D5aF63D0eb1582Ce587"
export const SCHEMA_REGISTRY_ADDRESS: Address =
  "0xA7b39296258348C78294F95B872b282326A97BDF"

// EIP-712 domain for offchain Attest signatures on mainnet EAS v0.26.
// Do NOT change without verifying against the deployed contract's
// eip712Domain() return values.
export const EAS_DOMAIN = {
  name: "EAS Attestation",
  version: "0.26",
  chainId: 1,
  verifyingContract: EAS_CONTRACT_ADDRESS,
} as const

// --- Sepolia (script dry-run only, NOT in wagmi-config) ---
// Used by scripts/register-eas-schemas.ts to verify the registration
// script before paying mainnet gas. EAS schema UIDs are deterministic
// from (schemaString, resolver, revocable), so Sepolia UIDs match
// mainnet UIDs exactly.
export const SEPOLIA_EAS_CONTRACT_ADDRESS: Address =
  "0xC2679fBD37d54388Ce493F1DB75320D236e1815e"
export const SEPOLIA_SCHEMA_REGISTRY_ADDRESS: Address =
  "0x0a7E2Ff54e76B8E6659aedc9103FB21c038050D0"

// Zero address used as the "no resolver" sentinel when computing schema UIDs.
export const ZERO_ADDRESS: Address =
  "0x0000000000000000000000000000000000000000"

// Zero bytes32 used for refUID when an attestation doesn't reference another.
export const ZERO_BYTES32: `0x${string}` =
  "0x0000000000000000000000000000000000000000000000000000000000000000"
