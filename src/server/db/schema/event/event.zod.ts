import { z } from "zod"
import { UserId, WorldEventId } from "@/lib/typeid"
import {
  EVENT_CATEGORY_VALUES,
  SEVERITY_LEVEL_VALUES,
} from "@/lib/event-constants"

// Re-export types so existing server-side imports still work
export type { EventCategory, SeverityLevel } from "@/lib/event-constants"

// --- Enum schemas derived from shared constants ---
export const eventCategorySchema = z.enum(EVENT_CATEGORY_VALUES)
export const severityLevelSchema = z.enum(SEVERITY_LEVEL_VALUES)

// --- API response schema (DB stores lat/lng separately, API returns coordinates tuple) ---
export const worldEventResponseSchema = z.object({
  id: WorldEventId,
  title: z.string(),
  description: z.string(),
  category: eventCategorySchema,
  severity: severityLevelSchema,
  coordinates: z.tuple([z.number(), z.number()]),
  location: z.string(),
  timestamp: z.string(),
  source: z.string().nullable(),
  imageUrls: z.array(z.string()),
  userId: UserId,
  worldIdVerified: z.boolean(),
  creatorName: z.string(),
  agentAddress: z.string().nullable(),
})

// --- Inferred types ---
export type WorldEventResponse = z.infer<typeof worldEventResponseSchema>

// --- Create input schema ---
export const createEventInputSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  category: eventCategorySchema,
  severity: severityLevelSchema,
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  location: z.string().min(1).max(200),
  source: z.string().nullable().optional(),
  imageUrls: z.array(z.string().url()).max(5).optional(),
})
