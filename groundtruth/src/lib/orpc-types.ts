import type { AppRouterClient } from "@/server/api/router"

// Extract frontend types from oRPC client return types — always in sync with API
export type WorldEvent = Awaited<
  ReturnType<AppRouterClient["event"]["getAll"]>
>["items"][number]

export type ChatMessage = Awaited<
  ReturnType<AppRouterClient["chat"]["getMessages"]>
>[number]

// Re-export from shared constants — no server code in client bundle
export type { EventCategory, SeverityLevel } from "@/lib/event-constants"
export { EVENT_CATEGORY_VALUES, SEVERITY_LEVEL_VALUES } from "@/lib/event-constants"
