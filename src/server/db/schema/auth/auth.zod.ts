import { z } from "zod"

// --- World ID v4 proof response item ---
const responseItemV4Schema = z.object({
  identifier: z.string(),
  nullifier: z.string(),
  proof: z.union([z.string(), z.array(z.string())]),
  issuer_schema_id: z.number().optional(),
  expires_at_min: z.number().optional(),
  signal_hash: z.string().optional(),
}).passthrough()

// --- IDKit v4 result envelope (forwarded as-is to World ID verify API) ---
export const worldIdVerifyInputSchema = z.object({
  protocol_version: z.string(),
  nonce: z.string(),
  action: z.string(),
  action_description: z.string().optional(),
  responses: z.array(responseItemV4Schema),
  environment: z.string().optional(),
}).passthrough()

export type WorldIdVerifyInput = z.infer<typeof worldIdVerifyInputSchema>
