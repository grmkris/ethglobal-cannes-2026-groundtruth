import { z } from "zod"
import { UserId } from "@/lib/typeid"

export const sessionResponseSchema = z.object({
  userId: UserId,
  walletAddress: z.string().nullable(),
  chainId: z.number().nullable(),
  worldIdVerified: z.boolean(),
})

export type SessionResponse = z.infer<typeof sessionResponseSchema>

// --- World ID v4 proof response item ---
const responseItemV4Schema = z.object({
  identifier: z.string(),
  nullifier: z.string(),
  proof: z.array(z.string()),
  issuer_schema_id: z.number(),
  expires_at_min: z.number(),
  signal_hash: z.string().optional(),
})

// --- IDKit v4 result envelope ---
export const worldIdVerifyInputSchema = z.object({
  protocol_version: z.literal("4.0"),
  nonce: z.string(),
  action: z.string(),
  action_description: z.string().optional(),
  responses: z.array(responseItemV4Schema),
  environment: z.string().optional(),
})

export type WorldIdVerifyInput = z.infer<typeof worldIdVerifyInputSchema>
