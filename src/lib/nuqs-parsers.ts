import { createParser } from "nuqs"
import { WorldEventId, type WorldEventId as WorldEventIdType } from "@/lib/typeid"

export const parseAsWorldEventId = createParser<WorldEventIdType>({
  parse: (value) => {
    const result = WorldEventId.safeParse(value)
    return result.success ? result.data : null
  },
  serialize: (value) => value,
})
