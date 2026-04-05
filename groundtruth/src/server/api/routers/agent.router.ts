import { ORPCError } from "@orpc/server"
import { z } from "zod"
import { UserId, AgentProfileId, AgentWalletId } from "@/lib/typeid"
import { authedProcedure, publicProcedure } from "../api"

export const agentRouter = {
  create: authedProcedure
    .input(
      z.object({
        agentWalletId: AgentWalletId,
        label: z
          .string()
          .regex(/^[a-z0-9-]+$/, "Lowercase alphanumeric and hyphens only")
          .min(1)
          .max(32),
        parentEnsName: z.string().min(3),
        mandate: z.string().min(1).max(500),
        sources: z.string().max(500),
      })
    )
    .handler(async ({ input, context }) => {
      const userId = UserId.parse(context.session.user.id)
      context.log.set({ procedure: "agent.create", userId })

      return context.authService.createAgentProfile({
        userId,
        agentWalletId: input.agentWalletId,
        label: input.label,
        parentEnsName: input.parentEnsName,
        mandate: input.mandate,
        sources: input.sources,
      })
    }),

  recordStep: authedProcedure
    .input(
      z.object({
        profileId: AgentProfileId,
        step: z.number().int().min(1).max(4),
        erc8004AgentId: z.string().optional(),
      })
    )
    .handler(async ({ input, context }) => {
      const userId = UserId.parse(context.session.user.id)
      context.log.set({ procedure: "agent.recordStep", userId, step: input.step })

      const profile = await context.authService.getAgentProfileById({
        profileId: input.profileId,
      })
      if (!profile || profile.userId !== userId) {
        throw new ORPCError("FORBIDDEN", { message: "Not your agent profile" })
      }

      await context.authService.updateRegistrationStep({
        profileId: input.profileId,
        step: input.step,
        erc8004AgentId: input.erc8004AgentId,
      })

      return { ok: true }
    }),

  list: authedProcedure.handler(async ({ context }) => {
    const userId = UserId.parse(context.session.user.id)
    context.log.set({ procedure: "agent.list", userId })

    return context.authService.getAgentProfiles({ userId })
  }),

  unlinkWallet: authedProcedure
    .input(z.object({ walletId: AgentWalletId }))
    .handler(async ({ input, context }) => {
      const userId = UserId.parse(context.session.user.id)
      context.log.set({ procedure: "agent.unlinkWallet", userId })

      await context.authService.deleteAgentWallet({
        walletId: input.walletId,
        userId,
      })

      return { ok: true }
    }),

  delete: authedProcedure
    .input(z.object({ profileId: AgentProfileId }))
    .handler(async ({ input, context }) => {
      const userId = UserId.parse(context.session.user.id)
      context.log.set({ procedure: "agent.delete", userId })

      const profile = await context.authService.getAgentProfileById({
        profileId: input.profileId,
      })
      if (!profile || profile.userId !== userId) {
        throw new ORPCError("FORBIDDEN", { message: "Not your agent profile" })
      }
      if (profile.registrationStep >= 4) {
        throw new ORPCError("BAD_REQUEST", { message: "Cannot delete a completed registration" })
      }

      await context.authService.deleteAgentProfile({ profileId: input.profileId })
      return { ok: true }
    }),

  getWalletSignature: authedProcedure
    .input(z.object({ profileId: AgentProfileId }))
    .handler(async ({ input, context }) => {
      const userId = UserId.parse(context.session.user.id)
      const profile = await context.authService.getAgentProfileById({
        profileId: input.profileId,
      })
      if (!profile || profile.userId !== userId) {
        throw new ORPCError("FORBIDDEN", { message: "Not your agent profile" })
      }
      return context.authService.getWalletLinkSignature({
        profileId: input.profileId,
      })
    }),

  resolve: publicProcedure
    .input(z.object({ ensName: z.string() }))
    .handler(async ({ input, context }) => {
      context.log.set({ procedure: "agent.resolve", ensName: input.ensName })

      return context.authService.resolveAgentByEnsName({
        ensName: input.ensName,
      })
    }),

  listAll: publicProcedure.handler(async ({ context }) => {
    context.log.set({ procedure: "agent.listAll" })
    return context.authService.listAllCompletedAgents()
  }),
}
