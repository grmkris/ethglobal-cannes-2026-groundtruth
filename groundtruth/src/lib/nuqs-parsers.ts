import { createParser } from "nuqs"
import { WorldEventId, type WorldEventId as WorldEventIdType } from "@/lib/typeid"

export const parseAsWorldEventId = createParser<WorldEventIdType>({
  parse: (value) => {
    const result = WorldEventId.safeParse(value)
    return result.success ? result.data : null
  },
  serialize: (value) => value,
})

const COUNTRY_ISO3_RE = /^[A-Z]{3}$/

export const parseAsCountryIso3 = createParser<string>({
  parse: (value) => (COUNTRY_ISO3_RE.test(value) ? value : null),
  serialize: (value) => value,
})
