import { betterAuth } from "better-auth"
import { siwe } from "better-auth/plugins"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { generateRandomString } from "better-auth/crypto"
import { createPublicClient, http, type PublicClient } from "viem"
import { verifyMessage } from "viem/actions"
import { mainnet, base, baseSepolia } from "viem/chains"
import { DB_SCHEMA, type Database } from "./db/db"
import { env } from "@/env"

const httpOptions = { timeout: 5_000, retryCount: 0 } as const

const mainnetClient = createPublicClient({
  chain: mainnet,
  transport: http(
    `https://mainnet.infura.io/v3/${env.INFURA_PROJECT_ID}`,
    httpOptions
  ),
})

const baseClient = createPublicClient({
  chain: base,
  transport: http(
    `https://base-mainnet.infura.io/v3/${env.INFURA_PROJECT_ID}`,
    httpOptions
  ),
})

const baseSepoliaClient = createPublicClient({
  chain: baseSepolia,
  transport: http(
    `https://base-sepolia.infura.io/v3/${env.INFURA_PROJECT_ID}`,
    httpOptions
  ),
})

const clientByChainId: Record<number, PublicClient> = {
  [mainnet.id]: mainnetClient,
  [base.id]: baseClient,
  [baseSepolia.id]: baseSepoliaClient,
}

const ensClient = mainnetClient

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
          try {
            // Use viem's smart-wallet-aware verifyMessage action so that
            // ERC-1271 / ERC-6492 signatures from embedded smart wallets
            // (Reown social login) verify correctly. Falls back to mainnet
            // if the chain isn't in our supported set.
            const client = clientByChainId[chainId] ?? mainnetClient
            return await verifyMessage(client, {
              address: ensureHexString(address),
              message,
              signature: ensureHexString(signature),
            })
          } catch {
            return false
          }
        },
        ensLookup: async ({ walletAddress }) => {
          try {
            const ensName = await ensClient.getEnsName({
              address: ensureHexString(walletAddress),
            })
            const ensAvatar = ensName
              ? await ensClient.getEnsAvatar({ name: ensName })
              : null
            return {
              name: ensName || walletAddress,
              avatar: ensAvatar || "",
            }
          } catch {
            return { name: walletAddress, avatar: "" }
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
