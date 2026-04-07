import { betterAuth } from "better-auth"
import { siwe } from "better-auth/plugins"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { generateRandomString } from "better-auth/crypto"
import { verifyMessage } from "viem/actions"
import { mainnetClient } from "@/lib/chain-clients"
import { DB_SCHEMA, type Database } from "./db/db"
import { fetchReownIdentity } from "@/lib/reown-identity"

function ensureHexString(value: string): `0x${string}` {
  if (!value.startsWith("0x")) throw new Error(`Invalid hex string: ${value}`)
  return value as `0x${string}`
}

export function createAuth(props: {
  db: Database
  secret: string
  domain: string
  baseURL: string
}) {
  const { db, secret, domain, baseURL } = props

  return betterAuth({
    database: drizzleAdapter(db, { provider: "pg", schema: DB_SCHEMA }),
    secret,
    baseURL,
    trustedOrigins: ["https://groundtruth.grm.wtf"],
    user: {
      additionalFields: {
        worldIdVerified: {
          type: "boolean",
          defaultValue: false,
          input: false,
        },
      },
    },
    plugins: [
      siwe({
        domain,
        emailDomainName: "wallet.groundtruth.grm.wtf",
        anonymous: true,
        getNonce: async () => {
          return generateRandomString(32, "a-z", "A-Z", "0-9")
        },
        verifyMessage: async ({ message, signature, address, chainId }) => {
          // Sanity check: hex must be even-length. Catches transcription bugs.
          if (
            !signature.startsWith("0x") ||
            (signature.length - 2) % 2 !== 0
          ) {
            console.error("[siwe] signature is not valid hex", {
              length: signature.length,
            })
            return false
          }
          // Smart-wallet-aware verification (ERC-1271 / ERC-6492) against
          // mainnet via the shared Reown-RPC mainnet client. The only chain
          // Ground Truth signs SIWE messages on is Ethereum mainnet.
          try {
            const ok = await verifyMessage(mainnetClient, {
              address: ensureHexString(address),
              message,
              signature: ensureHexString(signature),
            })
            if (!ok) {
              console.warn("[siwe] verifyMessage returned false", {
                address,
                chainId,
              })
            }
            return ok
          } catch (err) {
            console.error("[siwe] verifyMessage threw", err)
            return false
          }
        },
        ensLookup: async ({ walletAddress }) => {
          // Reown's Identity API aggregates ENS, CCIP-read offchain names, and
          // Reown profile names in one call. Reuses our existing project id —
          // no Infura roundtrip, no extra RPC tuning.
          const { name, avatar } = await fetchReownIdentity(walletAddress)
          return {
            name: name ?? walletAddress,
            avatar: avatar ?? "",
          }
        },
      }),
    ],
    advanced: {
      database: { generateId: false },
    },
  })
}

export type Auth = ReturnType<typeof createAuth>
