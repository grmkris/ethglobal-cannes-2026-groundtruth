import { ORPCError } from "@orpc/server"
import { z } from "zod"
import { UserId, WorldEventId } from "@/lib/typeid"
import {
  createEventInputSchema,
  eventCategorySchema,
  severityLevelSchema,
} from "@/server/db/schema/event/event.zod"
import { DISPUTE_REASONS } from "@/lib/event-constants"
import { authedProcedure, publicProcedure } from "../api"

export const eventRouter = {
  getAll: publicProcedure
    .input(
      z
        .object({
          category: z.union([eventCategorySchema, z.array(eventCategorySchema)]).optional(),
          severity: severityLevelSchema.optional(),
          search: z.string().optional(),
          limit: z.number().int().min(1).max(200).optional(),
          cursor: WorldEventId.optional(),
        })
        .optional()
    )
    .handler(async ({ input, context }) => {
      context.log.set({ procedure: "event.getAll", filters: input })
      return context.eventService.getAll(input)
    }),

  create: authedProcedure
    .input(createEventInputSchema)
    .handler(async ({ input, context }) => {
      const userId = UserId.parse(context.session.user.id)
      context.log.set({ procedure: "event.create", category: input.category, userId })
      return context.eventService.create({ ...input, userId })
    }),

  getById: publicProcedure
    .input(z.object({ id: WorldEventId }))
    .handler(async ({ input, context }) => {
      context.log.set({ procedure: "event.getById", eventId: input.id })
      const event = await context.eventService.getById({ id: input.id })
      if (!event) {
        throw new ORPCError("NOT_FOUND", { message: "Event not found" })
      }
      return event
    }),

  dispute: authedProcedure
    .input(
      z.object({
        eventId: WorldEventId,
        reason: z.enum(DISPUTE_REASONS),
        justification: z.string().max(500).optional(),
        txHash: z.string().optional(),
        attestationUid: z
          .string()
          .regex(/^0x[0-9a-fA-F]{64}$/)
          .optional(),
      })
    )
    .handler(async ({ input, context }) => {
      const userId = UserId.parse(context.session.user.id)
      context.log.set({ procedure: "event.dispute", eventId: input.eventId, userId })

      // Must be World ID verified
      const isVerified = await context.authService.isWorldIdVerified({ userId })
      if (!isVerified) {
        throw new ORPCError("FORBIDDEN", { message: "World ID verification required to dispute" })
      }

      // Check event exists and is agent-submitted
      const event = await context.eventService.getById({ id: input.eventId })
      if (!event) {
        throw new ORPCError("NOT_FOUND", { message: "Event not found" })
      }
      if (!event.agentAddress) {
        throw new ORPCError("BAD_REQUEST", { message: "Can only dispute agent-submitted events" })
      }

      // One dispute per user per event
      const alreadyDisputed = await context.eventService.hasUserDisputed({
        eventId: input.eventId,
        userId,
      })
      if (alreadyDisputed) {
        throw new ORPCError("BAD_REQUEST", { message: "You have already disputed this event" })
      }

      return context.eventService.createDispute({
        eventId: input.eventId,
        userId,
        reason: input.reason,
        justification: input.justification,
        txHash: input.txHash,
        attestationUid: input.attestationUid,
      })
    }),

  getDisputes: publicProcedure
    .input(z.object({ eventId: WorldEventId }))
    .handler(async ({ input, context }) => {
      return context.eventService.getDisputes({ eventId: input.eventId })
    }),

  getAgentActivity: publicProcedure
    .handler(async ({ context }) => {
      context.log.set({ procedure: "event.getAgentActivity" })
      return context.eventService.getAgentActivity()
    }),
}
