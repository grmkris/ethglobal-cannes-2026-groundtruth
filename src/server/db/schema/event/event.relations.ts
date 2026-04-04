import { relations } from "drizzle-orm"
import { worldEvent } from "./event.db"

export const worldEventRelations = relations(worldEvent, () => ({}))
