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

export const createTimestampField = (name?: string) => {
  if (!name) {
    return timestamp({ withTimezone: true, mode: "date" })
  }
  return timestamp(name, { withTimezone: true, mode: "date" })
}

export const baseEntityFields = {
  createdAt: createTimestampField("created_at").defaultNow().notNull(),
  updatedAt: createTimestampField("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
}
