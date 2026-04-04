import { type Hex } from "viem"

// --- Contract Addresses ---

// ENS (Ethereum Mainnet)
export const ENS_NAME_WRAPPER = "0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401" as const
export const ENS_PUBLIC_RESOLVER = "0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63" as const

// ERC-8004 (Base Sepolia)
export const ERC8004_IDENTITY_REGISTRY = "0x8004A818BFB912233c491871b3d84c89A494BD9e" as const
export const ERC8004_REPUTATION_REGISTRY = "0x8004B663056A597Dffe9eCcC1965A193B7388713" as const
export const ERC8004_CHAIN_ID = 84532 // Base Sepolia

// --- Minimal ABIs ---

export const nameWrapperAbi = [
  {
    name: "setSubnodeRecord",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "parentNode", type: "bytes32" },
      { name: "label", type: "string" },
      { name: "owner", type: "address" },
      { name: "resolver", type: "address" },
      { name: "ttl", type: "uint64" },
      { name: "fuses", type: "uint32" },
      { name: "expiry", type: "uint64" },
    ],
    outputs: [{ name: "node", type: "bytes32" }],
  },
  {
    name: "ownerOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
] as const

export const publicResolverAbi = [
  {
    name: "setText",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "key", type: "string" },
      { name: "value", type: "string" },
    ],
    outputs: [],
  },
  {
    name: "multicall",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "data", type: "bytes[]" }],
    outputs: [{ name: "results", type: "bytes[]" }],
  },
  {
    name: "text",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "key", type: "string" },
    ],
    outputs: [{ name: "", type: "string" }],
  },
] as const

export const identityRegistryAbi = [
  {
    name: "register",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "agentURI", type: "string" }],
    outputs: [{ name: "agentId", type: "uint256" }],
  },
  {
    name: "ownerOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "getAgentWallet",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "Registered",
    type: "event",
    inputs: [
      { name: "agentId", type: "uint256", indexed: true },
      { name: "agentURI", type: "string", indexed: false },
      { name: "owner", type: "address", indexed: true },
    ],
  },
] as const

export const reputationRegistryAbi = [
  {
    name: "getSummary",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "tags", type: "string[]" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "totalFeedback", type: "uint256" },
          { name: "averageValue", type: "uint256" },
        ],
      },
    ],
  },
] as const

// --- ENSIP-25 Helpers ---

/**
 * Build ENSIP-25 text record key for cross-chain agent verification.
 * Format: agent-registration[<erc7930_registry>][<agentId>]
 *
 * For hackathon: uses simplified CAIP-style registry identifier
 * (full ERC-7930 binary encoding is still draft spec)
 */
export function buildEnsip25Key(
  chainId: number,
  registryAddress: string,
  agentId: string | number,
): string {
  // Simplified ERC-7930-style identifier: eip155:<chainId>:<address>
  const registry = `eip155:${chainId}:${registryAddress.toLowerCase()}`
  return `agent-registration[${registry}][${agentId}]`
}

/**
 * Build the default ENSIP-25 key for our ERC-8004 Identity Registry on Base Sepolia
 */
export function buildDefaultEnsip25Key(agentId: string | number): string {
  return buildEnsip25Key(ERC8004_CHAIN_ID, ERC8004_IDENTITY_REGISTRY, agentId)
}
