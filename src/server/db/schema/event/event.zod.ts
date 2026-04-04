import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import { z } from "zod"
import {
  eventCategoryEnum,
  severityLevelEnum,
  worldEvent,
} from "./event.db"

// --- Enum schemas derived from pgEnums ---
export const eventCategorySchema = z.enum(eventCategoryEnum.enumValues)
export const severityLevelSchema = z.enum(severityLevelEnum.enumValues)

// --- DB row schemas ---
export const worldEventSelectSchema = createSelectSchema(worldEvent)
export const worldEventInsertSchema = createInsertSchema(worldEvent)

// --- API response schema (DB stores lat/lng separately, API returns coordinates tuple) ---
export const worldEventResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  category: eventCategorySchema,
  severity: severityLevelSchema,
  coordinates: z.tuple([z.number(), z.number()]),
  location: z.string(),
  timestamp: z.string(),
  source: z.string().nullable(),
})

// --- Inferred types ---
export type EventCategory = z.infer<typeof eventCategorySchema>
export type SeverityLevel = z.infer<typeof severityLevelSchema>
export type WorldEventSelect = z.infer<typeof worldEventSelectSchema>
export type WorldEventInsert = z.infer<typeof worldEventInsertSchema>
export type WorldEventResponse = z.infer<typeof worldEventResponseSchema>

// --- Runtime enum value arrays (for iteration) ---
export const EVENT_CATEGORY_VALUES = eventCategoryEnum.enumValues
export const SEVERITY_LEVEL_VALUES = severityLevelEnum.enumValues
