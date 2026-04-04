import type { AppRouterClient } from "@/server/api/router"

// Extract frontend types from oRPC client return types — always in sync with API
export type WorldEvent = Awaited<
  ReturnType<AppRouterClient["event"]["getAll"]>
>[number]

// Re-export enum types and runtime arrays from the Zod layer
export type {
  EventCategory,
  SeverityLevel,
} from "@/server/db/schema/event/event.zod"
export {
  EVENT_CATEGORY_VALUES,
  SEVERITY_LEVEL_VALUES,
} from "@/server/db/schema/event/event.zod"
