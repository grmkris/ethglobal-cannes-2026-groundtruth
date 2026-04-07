import { createPublicClient, http } from "viem"
import { mainnet } from "viem/chains"
import { env } from "@/env"

// Reown's RPC is gas-tuned for the deployless ERC-6492 verification eth_call
// used to verify embedded smart-wallet (Safe v1.4.1) signatures from social
// login. Generic RPCs (Infura free, Cloudflare, etc.) cap eth_call gas too
// low to simulate Safe deployment + isValidSignature in one call.
// Reference: https://github.com/reown-com/appkit-web-examples/blob/main/nextjs/next-siwe-next-auth/app/api/auth/%5B...nextauth%5D/route.ts
const reownMainnetTransport = http(
  `https://rpc.walletconnect.org/v1/?chainId=eip155:${mainnet.id}&projectId=${env.NEXT_PUBLIC_REOWN_PROJECT_ID}`,
  { timeout: 30_000, retryCount: 2 }
)

/**
 * Shared Ethereum mainnet public client used for smart-wallet-aware read
 * operations — SIWE signature verification, EAS attestation verification,
 * and any future ERC-1271 / ERC-6492 flows. Single instance shared across
 * `server/auth.ts`, `lib/eas/verify.ts`, and other callers.
 */
export const mainnetClient = createPublicClient({
  chain: mainnet,
  transport: reownMainnetTransport,
})
