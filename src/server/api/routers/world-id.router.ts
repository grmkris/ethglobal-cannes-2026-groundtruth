import { signRequest } from "@worldcoin/idkit/signing"
import { worldIdVerifyInputSchema } from "@/server/db/schema/auth/auth.zod"
import { UserId } from "@/lib/typeid"
import { env } from "@/env"
import { authedProcedure } from "../api"

export const worldIdRouter = {
  getSignature: authedProcedure.handler(async ({ context }) => {
    context.log.set({ procedure: "worldId.getSignature" })

    const rpSig = signRequest("verify-human", env.WORLD_SIGNING_KEY)

    return {
      rp_context: {
        rp_id: env.WORLD_APP_ID,
        nonce: rpSig.nonce,
        created_at: rpSig.createdAt,
        expires_at: rpSig.expiresAt,
        signature: rpSig.sig,
      },
    }
  }),

  verify: authedProcedure
    .input(worldIdVerifyInputSchema)
    .handler(async ({ input, context }) => {
      const userId = UserId.parse(context.session.user.id)
      context.log.set({ procedure: "worldId.verify", userId })

      const response = input.responses[0]
      if (!response) {
        throw new Error("No proof response")
      }

      const res = await fetch(
        `https://developer.world.org/api/v4/verify/${env.WORLD_APP_ID}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        }
      )

      if (!res.ok) {
        const errorBody = await res.text()
        context.log.set({ worldApiError: errorBody })
        throw new Error("World ID verification failed")
      }

      await context.authService.verifyWorldId({
        userId,
        nullifierHash: response.nullifier,
      })

      context.log.set({ verified: true })
      return { verified: true }
    }),
}
