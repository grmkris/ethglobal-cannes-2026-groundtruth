import { and, desc, eq } from "drizzle-orm"
import { getAddress, type Address, type Hex } from "viem"
import type { Database } from "../db/db"
import {
  easAttestation,
  type EasAttestation,
  type NewEasAttestation,
} from "../db/schema/attestation/attestation.db"
import {
  buildOffchainAttestation,
  verifyOffchainAttestation,
  getSchemaByUid,
  type GroundTruthSchema,
} from "@/lib/eas"

/**
 * refType enum matching the attestation table column.
 */
export type AttestationRefType = "event" | "agent" | "user" | "source"

export interface CreateOffchainAttestationParams {
  schema: GroundTruthSchema
  data: Record<string, unknown>
  refType: AttestationRefType
  refId: string
  attester: Address
  recipient?: Address
  signature: Hex
  time: bigint
  expirationTime?: bigint
  refUID?: Hex
}

/**
 * JSON-safe snapshot of the EIP-712 domain used for signing. Stored in
 * DB so signatures can be re-verified later even if the canonical domain
 * constants drift.
 */
interface SerializedDomain {
  name: string
  version: string
  chainId: number
  verifyingContract: Address
}

export function createAttestationService(props: { db: Database }) {
  const { db } = props

  /**
   * Verify an offchain EAS attestation signature and persist it.
   * Throws on invalid signature or unknown schema.
   */
  async function createOffchainAttestation(
    params: CreateOffchainAttestationParams
  ): Promise<EasAttestation> {
    // Rebuild the attestation locally from the same inputs the signer
    // used, so we know the UID is correct and the signed message matches.
    const unsigned = buildOffchainAttestation({
      schema: params.schema,
      data: params.data,
      attester: getAddress(params.attester),
      recipient: params.recipient,
      refUID: params.refUID,
      time: params.time,
      expirationTime: params.expirationTime,
    })

    const ok = await verifyOffchainAttestation({
      attester: unsigned.attester,
      signature: params.signature,
      message: unsigned.message,
    })
    if (!ok) {
      throw new Error(
        `[attestation] signature verification failed for attester ${unsigned.attester}`
      )
    }

    const domain: SerializedDomain = {
      name: unsigned.domain.name!,
      version: unsigned.domain.version!,
      chainId: Number(unsigned.domain.chainId!),
      verifyingContract: unsigned.domain.verifyingContract! as Address,
    }

    const row: NewEasAttestation = {
      uid: unsigned.uid,
      schemaUid: params.schema.uid,
      schemaName: params.schema.name,
      attester: unsigned.attester,
      recipient: unsigned.recipient,
      chain: 0, // offchain
      refType: params.refType,
      refId: params.refId,
      schemaData: params.data,
      rawData: unsigned.rawData,
      signature: params.signature,
      eip712Domain: domain,
      attestationTime: unsigned.time,
      expirationTime: unsigned.expirationTime,
      revocable: unsigned.revocable,
      refUid: unsigned.refUID,
    }

    const [inserted] = await db
      .insert(easAttestation)
      .values(row)
      .onConflictDoNothing({ target: easAttestation.uid })
      .returning()

    // If the insert was a no-op due to conflict, fetch the existing row
    // so callers always get a valid attestation back.
    if (!inserted) {
      const existing = await db.query.easAttestation.findFirst({
        where: eq(easAttestation.uid, unsigned.uid),
      })
      if (!existing) {
        throw new Error(`[attestation] failed to insert ${unsigned.uid}`)
      }
      return existing
    }
    return inserted
  }

  async function getByUid(uid: Hex): Promise<EasAttestation | null> {
    const row = await db.query.easAttestation.findFirst({
      where: eq(easAttestation.uid, uid),
    })
    return row ?? null
  }

  async function listForRef(params: {
    refType: AttestationRefType
    refId: string
    schemaUid?: Hex
  }): Promise<EasAttestation[]> {
    const conditions = [
      eq(easAttestation.refType, params.refType),
      eq(easAttestation.refId, params.refId),
    ]
    if (params.schemaUid) {
      conditions.push(eq(easAttestation.schemaUid, params.schemaUid))
    }
    return db
      .select()
      .from(easAttestation)
      .where(and(...conditions))
      .orderBy(desc(easAttestation.attestationTime))
  }

  /**
   * Re-verify a stored attestation against its recorded signature.
   * Useful for debugging and for the `attestation.verify` API endpoint.
   */
  async function verifyStored(uid: Hex): Promise<boolean> {
    const row = await getByUid(uid)
    if (!row) return false
    const schema = getSchemaByUid(row.schemaUid as Hex)
    if (!schema) return false
    if (!row.signature) return false

    return verifyOffchainAttestation({
      attester: row.attester as Address,
      signature: row.signature as Hex,
      message: {
        schema: row.schemaUid as Hex,
        recipient: row.recipient as Address,
        time: row.attestationTime,
        expirationTime: row.expirationTime,
        revocable: row.revocable,
        refUID: row.refUid as Hex,
        data: row.rawData as Hex,
      },
    })
  }

  /**
   * Mark an attestation as promoted on-chain (called after the promote
   * tx is confirmed client-side).
   */
  async function markPromoted(params: {
    uid: Hex
    txHash: Hex
    blockNumber: bigint
    chain: number
  }): Promise<EasAttestation> {
    const [updated] = await db
      .update(easAttestation)
      .set({
        txHash: params.txHash,
        blockNumber: params.blockNumber,
        chain: params.chain,
        promotedAt: new Date(),
      })
      .where(eq(easAttestation.uid, params.uid))
      .returning()
    if (!updated) {
      throw new Error(`[attestation] promote target not found: ${params.uid}`)
    }
    return updated
  }

  /**
   * Mark an attestation as revoked (offchain). Onchain revocation is a
   * separate tx handled by the promote flow.
   */
  async function markRevoked(params: {
    uid: Hex
    attester: Address
    revokeTxHash?: Hex
  }): Promise<EasAttestation> {
    const existing = await getByUid(params.uid)
    if (!existing) {
      throw new Error(`[attestation] revoke target not found: ${params.uid}`)
    }
    if (existing.attester.toLowerCase() !== params.attester.toLowerCase()) {
      throw new Error("[attestation] only the attester can revoke")
    }
    if (!existing.revocable) {
      throw new Error("[attestation] schema does not allow revocation")
    }

    const [updated] = await db
      .update(easAttestation)
      .set({
        isRevoked: true,
        revokedAt: new Date(),
        revokeTxHash: params.revokeTxHash ?? null,
      })
      .where(eq(easAttestation.uid, params.uid))
      .returning()
    if (!updated) {
      throw new Error(`[attestation] revoke failed: ${params.uid}`)
    }
    return updated
  }

  return {
    createOffchainAttestation,
    getByUid,
    listForRef,
    verifyStored,
    markPromoted,
    markRevoked,
  }
}

export type AttestationService = ReturnType<typeof createAttestationService>
