import { desc, eq, sql } from "drizzle-orm"
import type { Database } from "../db/db"
import { paymentLedger } from "../db/schema/auth/auth.db"
import { worldEvent } from "../db/schema/event/event.db"

export function createPaymentService({ db }: { db: Database }) {
  return {
    /** Record a paid API call in the ledger */
    async recordPayment(params: {
      payerAddress: string
      route: string
      amountUsd: string
      network?: string | null
      category?: string | null
    }) {
      await db.insert(paymentLedger).values({
        payerAddress: params.payerAddress,
        route: params.route,
        amountUsd: params.amountUsd,
        network: params.network ?? null,
        category: params.category ?? null,
      })
    },

    /** Get aggregate payment stats */
    async getStats() {
      const totalResult = await db
        .select({
          count: sql<number>`count(*)::int`,
          totalUsd: sql<string>`coalesce(sum(${paymentLedger.amountUsd}::numeric), 0)::text`,
        })
        .from(paymentLedger)

      const byCategory = await db
        .select({
          category: paymentLedger.category,
          count: sql<number>`count(*)::int`,
          totalUsd: sql<string>`coalesce(sum(${paymentLedger.amountUsd}::numeric), 0)::text`,
        })
        .from(paymentLedger)
        .groupBy(paymentLedger.category)

      const recentPayments = await db
        .select()
        .from(paymentLedger)
        .orderBy(desc(paymentLedger.createdAt))
        .limit(20)

      return {
        totalTransactions: totalResult[0]?.count ?? 0,
        totalRevenueUsd: totalResult[0]?.totalUsd ?? "0",
        revenueByCategory: byCategory.map((r) => ({
          category: r.category,
          transactions: r.count,
          totalUsd: r.totalUsd,
        })),
        recentPayments: recentPayments.map((p) => ({
          id: p.id,
          payerAddress: p.payerAddress,
          route: p.route,
          amountUsd: p.amountUsd,
          network: p.network,
          category: p.category,
          createdAt: p.createdAt,
        })),
      }
    },

    /** Get revenue leaderboard — agents ranked by estimated earnings */
    async getRevenueLeaderboard() {
      // Calculate: for each category, how much total read revenue?
      // Then distribute to agents proportional to their event contribution count.
      const categoryRevenue = await db
        .select({
          category: paymentLedger.category,
          totalUsd: sql<string>`coalesce(sum(${paymentLedger.amountUsd}::numeric), 0)::text`,
        })
        .from(paymentLedger)
        .where(sql`${paymentLedger.route} like 'GET%'`)
        .groupBy(paymentLedger.category)

      const categoryRevenueMap = new Map<string | null, number>()
      for (const r of categoryRevenue) {
        categoryRevenueMap.set(r.category, parseFloat(r.totalUsd))
      }

      // Count each agent's events per category
      const agentContributions = await db
        .select({
          agentAddress: worldEvent.agentAddress,
          agentEnsName: worldEvent.agentEnsName,
          category: worldEvent.category,
          eventCount: sql<number>`count(*)::int`,
        })
        .from(worldEvent)
        .where(sql`${worldEvent.agentAddress} is not null`)
        .groupBy(worldEvent.agentAddress, worldEvent.agentEnsName, worldEvent.category)

      // Count total events per category (for share calculation)
      const categoryTotals = await db
        .select({
          category: worldEvent.category,
          totalEvents: sql<number>`count(*)::int`,
        })
        .from(worldEvent)
        .where(sql`${worldEvent.agentAddress} is not null`)
        .groupBy(worldEvent.category)

      const categoryTotalMap = new Map<string, number>()
      for (const c of categoryTotals) {
        categoryTotalMap.set(c.category, c.totalEvents)
      }

      // Calculate each agent's estimated earnings
      const agentEarnings = new Map<string, {
        agentAddress: string
        agentEnsName: string | null
        eventsSubmitted: number
        estimatedEarningsUsd: number
      }>()

      for (const contrib of agentContributions) {
        if (!contrib.agentAddress) continue
        const existing = agentEarnings.get(contrib.agentAddress) ?? {
          agentAddress: contrib.agentAddress,
          agentEnsName: contrib.agentEnsName,
          eventsSubmitted: 0,
          estimatedEarningsUsd: 0,
        }

        existing.eventsSubmitted += contrib.eventCount

        const catRevenue = categoryRevenueMap.get(contrib.category) ?? 0
        const catTotal = categoryTotalMap.get(contrib.category) ?? 1
        existing.estimatedEarningsUsd += (contrib.eventCount / catTotal) * catRevenue

        agentEarnings.set(contrib.agentAddress, existing)
      }

      return Array.from(agentEarnings.values())
        .sort((a, b) => b.estimatedEarningsUsd - a.estimatedEarningsUsd)
        .map((a) => ({
          ...a,
          estimatedEarningsUsd: a.estimatedEarningsUsd.toFixed(6),
        }))
    },
  }
}

export type PaymentService = ReturnType<typeof createPaymentService>
