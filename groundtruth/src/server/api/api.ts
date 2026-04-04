import { os, ORPCError } from "@orpc/server"
import type { Context } from "./context"

export const o = os.$context<Context>()
export const publicProcedure = o

export const authedProcedure = publicProcedure.use(
  async ({ context, next }) => {
    if (!context.session) {
      throw new ORPCError("UNAUTHORIZED", {
        message: "Connect wallet to continue",
      })
    }
    return next({
      context: {
        ...context,
        session: context.session as NonNullable<typeof context.session>,
      },
    })
  }
)
