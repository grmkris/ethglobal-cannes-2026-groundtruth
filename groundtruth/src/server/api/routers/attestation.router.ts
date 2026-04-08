import { ORPCError } from "@orpc/server"
import { z } from "zod"
import { getAddress, type Address, type Hex } from "viem"
import { authedProcedure, publicProcedure } from "../api"
import {
  getSchemaByUid,
  buildOnchainAttestRequest,
  EAS_CONTRACT_ADDRESS,
} from "@/lib/eas"

const hexSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]+$/, "must be 0x-prefixed hex")
  .transform((s) => s as Hex)

const uidSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]{64}$/, "must be a 0x-prefixed 32-byte hex")
  .transform((s) => s as Hex)

const addressSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/, "must be a 0x-prefixed 20-byte hex")
  .transform((s) => getAddress(s))

const refTypeSchema = z.enum(["event", "agent", "user", "source"])

export const attestationRouter = {
  /**
   * Create an offchain EAS attestation from a signed EIP-712 payload.
   * The server re-builds the attestation from the inputs, verifies the
   * signature via smart-wallet-aware verifyTypedData, and stores the row.
   *
   * Intentionally `publicProcedure`: the signature is the source of truth
   * for "who signed this attestation". Cross-checking against a session
   * wallet would add no security (an attacker with a valid signature
   * already has the private key), and SIWE sessions may not have a
   * convenient wallet field populated. TODO: add per-IP rate limiting
   * before this is production-hot — see cleanup plan for follow-up.
   */
  create: publicProcedure
    .input(
      z.object({
        schemaUid: uidSchema,
        refType: refTypeSchema,
        refId: z.string().min(1),
        data: z.record(z.string(), z.unknown()),
        attester: addressSchema,
        recipient: addressSchema.optional(),
        signature: hexSchema,
        // Serialized bigint fields: accept numbers or stringified ints.
        time: z.union([z.number(), z.string()]).transform((v) => BigInt(v)),
        expirationTime: z
          .union([z.number(), z.string()])
          .transform((v) => BigInt(v))
          .optional(),
        refUID: uidSchema.optional(),
      })
    )
    .handler(async ({ input, context }) => {
      context.log.set({ procedure: "attestation.create", refId: input.refId })
      const schema = getSchemaByUid(input.schemaUid)
      if (!schema) {
        throw new ORPCError("BAD_REQUEST", {
          message: `Unknown schema UID: ${input.schemaUid}`,
        })
      }

      try {
        return await context.attestationService.createOffchainAttestation({
          schema,
          data: input.data,
          refType: input.refType,
          refId: input.refId,
          attester: input.attester as Address,
          recipient: input.recipient as Address | undefined,
          signature: input.signature,
          time: input.time,
          expirationTime: input.expirationTime,
          refUID: input.refUID,
        })
      } catch (err) {
        throw new ORPCError("BAD_REQUEST", {
          message: err instanceof Error ? err.message : "attestation failed",
        })
      }
    }),

  listForRef: publicProcedure
    .input(
      z.object({
        refType: refTypeSchema,
        refId: z.string().min(1),
        schemaUid: uidSchema.optional(),
      })
    )
    .handler(async ({ input, context }) => {
      return context.attestationService.listForRef(input)
    }),

  verify: publicProcedure
    .input(z.object({ uid: uidSchema }))
    .handler(async ({ input, context }) => {
      const ok = await context.attestationService.verifyStored(input.uid)
      return { valid: ok }
    }),

  /**
   * Return the prepared on-chain attest() call data for a stored
   * offchain attestation. The client submits the tx via wagmi, then
   * calls `markPromoted` with the confirmed tx hash.
   *
   * Note: this does NOT submit the tx server-side — we never hold a
   * mainnet key. The client's wallet submits and pays the gas.
   */
  prepareOnchainPromotion: authedProcedure
    .input(z.object({ uid: uidSchema }))
    .handler(async ({ input, context }) => {
      const row = await context.attestationService.getByUid(input.uid)
      if (!row) {
        throw new ORPCError("NOT_FOUND", { message: "attestation not found" })
      }
      if (row.chain !== 0) {
        throw new ORPCError("BAD_REQUEST", {
          message: "attestation is already on-chain",
        })
      }
      const request = buildOnchainAttestRequest({
        schemaUid: row.schemaUid as Hex,
        recipient: row.recipient as Address,
        expirationTime: row.expirationTime,
        revocable: row.revocable,
        refUID: row.refUid as Hex,
        data: row.rawData as Hex,
      })
      return {
        to: EAS_CONTRACT_ADDRESS,
        abi: request.abi,
        functionName: request.functionName,
        args: request.args,
      }
    }),

  markPromoted: authedProcedure
    .input(
      z.object({
        uid: uidSchema,
        txHash: uidSchema,
        blockNumber: z.union([z.number(), z.string()]).transform((v) => BigInt(v)),
        chain: z.number().int().positive(),
      })
    )
    .handler(async ({ input, context }) => {
      return context.attestationService.markPromoted(input)
    }),
}
