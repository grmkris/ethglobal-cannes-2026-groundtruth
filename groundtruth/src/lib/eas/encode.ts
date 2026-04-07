import { encodeAbiParameters, type Hex } from "viem"
import type { GroundTruthSchema } from "./schemas"

/**
 * Encode a schema data payload into the ABI-encoded bytes that go into
 * an EAS attestation's `data` field. Uses viem.encodeAbiParameters with
 * the schema's declared abiTypes.
 */
export function encodeSchemaData(
  schema: GroundTruthSchema,
  data: Record<string, unknown>
): Hex {
  const values = schema.abiTypes.map((param) => {
    const value = data[param.name]
    if (value === undefined) {
      throw new Error(
        `Missing field "${param.name}" for schema "${schema.name}"`
      )
    }
    return value
  })
  return encodeAbiParameters(
    schema.abiTypes.map((p) => ({ name: p.name, type: p.type })),
    values
  )
}
