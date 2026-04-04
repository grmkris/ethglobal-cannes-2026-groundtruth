import { fromString, getType, TypeID, toUUID, typeid } from "typeid-js"
import { z } from "zod"

const typeIdLength = 26

export const idTypesMapNameToPrefix = {
  worldEvent: "wev",
  wallet: "wal",
} as const

type IdTypesMapNameToPrefix = typeof idTypesMapNameToPrefix

type IdTypesMapPrefixToName = {
  [K in keyof IdTypesMapNameToPrefix as IdTypesMapNameToPrefix[K]]: K
}

const idTypesMapPrefixToName = Object.fromEntries(
  Object.entries(idTypesMapNameToPrefix).map(([x, y]) => [y, x])
) as IdTypesMapPrefixToName

export type IdTypePrefixNames = keyof typeof idTypesMapNameToPrefix

export type TypeIdString<T extends IdTypePrefixNames> =
  `${(typeof idTypesMapNameToPrefix)[T]}_${string}`

export const typeIdValidator = <const T extends IdTypePrefixNames>(prefix: T) =>
  z
    .string()
    .startsWith(`${idTypesMapNameToPrefix[prefix]}_`)
    .length(typeIdLength + idTypesMapNameToPrefix[prefix].length + 1)
    .refine(
      (input) => {
        try {
          TypeID.fromString(input).asType(idTypesMapNameToPrefix[prefix])
          return true
        } catch {
          return false
        }
      },
      {
        message: `Invalid ${prefix} TypeID format`,
      }
    ) as z.ZodType<TypeIdString<T>, TypeIdString<T>>

export const typeIdGenerator = <const T extends IdTypePrefixNames>(prefix: T) =>
  typeid(idTypesMapNameToPrefix[prefix]).toString() as TypeIdString<T>

export const typeIdFromUuid = <const T extends IdTypePrefixNames>(
  prefix: T,
  uuid: string
) => {
  const actualPrefix = idTypesMapNameToPrefix[prefix]
  return TypeID.fromUUID(actualPrefix, uuid).toString() as TypeIdString<T>
}

export const typeIdToUuid = <const T extends IdTypePrefixNames>(
  input: TypeIdString<T>
) => {
  const id = fromString(input)
  return {
    uuid: toUUID(id).toString(),
    prefix: getType(id),
  }
}

export const validateTypeId = <const T extends IdTypePrefixNames>(
  prefix: T,
  data: unknown
): data is TypeIdString<T> => typeIdValidator(prefix).safeParse(data).success

// Exported validators and types
export const WorldEventId = typeIdValidator("worldEvent")
export type WorldEventId = z.infer<typeof WorldEventId>

export const WalletId = typeIdValidator("wallet")
export type WalletId = z.infer<typeof WalletId>
