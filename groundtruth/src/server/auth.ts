import { betterAuth } from "better-auth"
import { siwe } from "better-auth/plugins"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { generateRandomString } from "better-auth/crypto"
import { verifyMessage, createPublicClient, http } from "viem"
import { mainnet } from "viem/chains"
import { DB_SCHEMA, type Database } from "./db/db"
import { env } from "@/env"

const ensClient = createPublicClient({
  chain: mainnet,
  transport: http(`https://mainnet.infura.io/v3/${env.INFURA_PROJECT_ID}`, {
    timeout: 5_000,
    retryCount: 0,
  }),
})

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
        emailDomainName: "wallet.ethglobal-cannes-2026-groundtruth.vercel.app",
        anonymous: true,
        getNonce: async () => {
          return generateRandomString(32, "a-z", "A-Z", "0-9")
        },
        verifyMessage: async ({ message, signature, address }) => {
          try {
            return await verifyMessage({
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
