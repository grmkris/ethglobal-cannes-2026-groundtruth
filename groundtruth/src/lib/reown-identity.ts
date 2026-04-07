import { env } from "@/env"

const IDENTITY_API = "https://rpc.walletconnect.org/v1/identity"

export interface ReownIdentity {
  name: string | null
  avatar: string | null
}

/**
 * Resolves an Ethereum address to a name + avatar via Reown's Identity API.
 *
 * Backed by Reown's Blockchain API which aggregates vanilla ENS, CCIP-read
 * offchain names (Coinbase `*.cb.id`, etc.) and Reown profile names
 * (`*.connect.id`) in a single call. This is the same source AppKit's
 * `<appkit-button>` web component uses internally.
 *
 * Endpoint: GET /v1/identity/{address}?projectId=...&chainId=eip155:1
 * Response: { name: string | null, avatar: string | null }
 *
 * Never throws — returns nulls so callers can fall back cleanly.
 */
export async function fetchReownIdentity(
  address: string
): Promise<ReownIdentity> {
  try {
    const url = `${IDENTITY_API}/${address}?projectId=${env.NEXT_PUBLIC_REOWN_PROJECT_ID}&chainId=eip155:1`
    const res = await fetch(url, { headers: { Accept: "application/json" } })
    if (!res.ok) return { name: null, avatar: null }
    const data = (await res.json()) as {
      name?: string | null
      avatar?: string | null
    }
    const name = data.name && data.name !== "" ? data.name : null
    const avatar = data.avatar && data.avatar !== "" ? data.avatar : null
    return { name, avatar }
  } catch {
    return { name: null, avatar: null }
  }
}
