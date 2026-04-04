import { betterAuth } from "better-auth"
import { siwe } from "better-auth/plugins"
import { customSession } from "better-auth/plugins"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { generateRandomString } from "better-auth/crypto"
import { verifyMessage, createPublicClient, http } from "viem"
import { mainnet } from "viem/chains"
import { db } from "./db/db"
import * as schema from "./db/schema/schema"
import { eq } from "drizzle-orm"
import { env } from "./env"

const ensClient = createPublicClient({
  chain: mainnet,
  transport: http(),
})

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  secret: env.BETTER_AUTH_SECRET,
  plugins: [
    siwe({
      domain: env.AUTH_DOMAIN ?? "localhost",
      emailDomainName: "wallet.groundtruth.app",
      anonymous: true,
      getNonce: async () => {
        return generateRandomString(32, "a-z", "A-Z", "0-9")
      },
      verifyMessage: async ({ message, signature, address }) => {
        try {
          return await verifyMessage({
            address: address as `0x${string}`,
            message,
            signature: signature as `0x${string}`,
          })
        } catch {
          return false
        }
      },
      ensLookup: async ({ walletAddress }) => {
        try {
          const ensName = await ensClient.getEnsName({
            address: walletAddress as `0x${string}`,
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
    customSession(async ({ user, session }) => {
      const wallet = await db.query.walletAddress.findFirst({
        where: (w, { eq }) => eq(w.userId, session.userId),
      })
      return {
        user: {
          ...user,
          worldIdVerified: (user as Record<string, unknown>).worldIdVerified ?? false,
        },
        session: {
          ...session,
          walletAddress: wallet?.address ?? null,
          chainId: wallet?.chainId ?? null,
        },
      }
    }),
  ],
  advanced: {
    database: { generateId: false },
  },
})

export type Auth = typeof auth
