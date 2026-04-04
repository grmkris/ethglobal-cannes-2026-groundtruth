import { z } from "zod"
import { UserId } from "@/lib/typeid"

export const sessionResponseSchema = z.object({
  userId: UserId,
  walletAddress: z.string().nullable(),
  chainId: z.number().nullable(),
  worldIdVerified: z.boolean(),
})

export type SessionResponse = z.infer<typeof sessionResponseSchema>

export const worldIdVerifyInputSchema = z.object({
  proof: z.string(),
  nullifier: z.string(),
})

export type WorldIdVerifyInput = z.infer<typeof worldIdVerifyInputSchema>
