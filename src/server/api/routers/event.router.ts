import { ORPCError } from "@orpc/server"
import { z } from "zod"
import { WorldEventId } from "@/lib/typeid"
import {
  createEventInputSchema,
  eventCategorySchema,
  severityLevelSchema,
} from "@/server/db/schema/event/event.zod"
import { publicProcedure } from "../api"

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

  create: publicProcedure
    .input(createEventInputSchema)
    .handler(async ({ input, context }) => {
      context.log.set({ procedure: "event.create", category: input.category })
      return context.eventService.create(input)
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
