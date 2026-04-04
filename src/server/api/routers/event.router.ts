import { ORPCError } from "@orpc/server"
import { z } from "zod"
import { UserId, WorldEventId } from "@/lib/typeid"
import {
  createEventInputSchema,
  eventCategorySchema,
  severityLevelSchema,
} from "@/server/db/schema/event/event.zod"
import { authedProcedure, publicProcedure } from "../api"

export const eventRouter = {
  getAll: publicProcedure
    .input(
      z
        .object({
          category: eventCategorySchema.optional(),
          severity: severityLevelSchema.optional(),
          search: z.string().optional(),
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
}
