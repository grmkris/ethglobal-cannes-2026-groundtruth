import { customType, timestamp } from "drizzle-orm/pg-core"
import {
  type IdTypePrefixNames,
  type TypeIdString,
  typeIdFromUuid,
  typeIdToUuid,
} from "@/lib/typeid"

export const typeId = <const T extends IdTypePrefixNames>(
  prefix: T,
  columnName: string
) =>
  customType<{
    data: TypeIdString<T>
    driverData: string
  }>({
    dataType() {
      return "uuid"
    },
    fromDriver(input: string): TypeIdString<T> {
      return typeIdFromUuid(prefix, input)
    },
    toDriver(input: TypeIdString<T>): string {
      return typeIdToUuid(input).uuid
    },
  })(columnName)

export const baseEntityFields = {
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
}
