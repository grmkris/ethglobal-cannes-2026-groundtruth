import { publicProcedure } from "../api"

export const paymentRouter = {
  stats: publicProcedure.handler(async ({ context }) => {
    context.log.set({ procedure: "payment.stats" })
    return context.paymentService.getStats()
  }),

  leaderboard: publicProcedure.handler(async ({ context }) => {
    context.log.set({ procedure: "payment.leaderboard" })
    return context.paymentService.getRevenueLeaderboard()
  }),
}
