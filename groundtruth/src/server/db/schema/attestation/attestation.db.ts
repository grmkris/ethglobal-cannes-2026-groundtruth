import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core"
import { baseEntityFields } from "../../utils"

/**
 * Ground Truth EAS attestation store.
 *
 * Every attestation — off-chain (signed EIP-712 payload) or on-chain (EAS
 * contract state on mainnet) — gets one row here, keyed by its canonical
 * EAS UID. Offchain and onchain attestations share the same UID so that a
 * DB row stays consistent across an offchain → onchain promotion.
 *
 * Chain: 0 = offchain (signature-only); 1 = Ethereum mainnet.
 */
export const easAttestation = pgTable(
  "eas_attestation",
  {
    // Canonical EAS attestation UID (32-byte hex). Computed via
    // lib/eas/uid.ts#computeAttestationUid and matches the on-chain UID
    // produced by the EAS contract.
    uid: varchar("uid", { length: 66 }).primaryKey(),

    // The EAS schema UID this attestation conforms to. One of
    // GROUND_TRUTH_SCHEMAS[*].uid in v1.
    schemaUid: varchar("schema_uid", { length: 66 }).notNull(),
    // Human-readable schema identifier for debuggability. Denormalized.
    schemaName: text("schema_name").notNull(),

    // Who signed this (EOA or smart wallet).
    attester: varchar("attester", { length: 42 }).notNull(),
    // The attestation's subject wallet (zero address if not user-scoped).
    recipient: varchar("recipient", { length: 42 }).notNull(),

    // 0 = offchain (signature in DB only), 1 = Ethereum mainnet.
    chain: integer("chain").notNull().default(0),

    // Which in-app record this attestation is about.
    refType: text("ref_type", {
      enum: ["event", "agent", "user", "source"],
    }).notNull(),
    refId: text("ref_id").notNull(),

    // Decoded schema data as JSONB for easy querying + debugging.
    schemaData: jsonb("schema_data").notNull(),
    // ABI-encoded bytes (hex). Needed to re-derive the EAS UID or
    // promote the attestation on-chain without re-encoding.
    rawData: text("raw_data").notNull(),

    // Offchain signature fields (null when the row was created directly
    // on-chain via promote/attest).
    signature: text("signature"),
    // EIP-712 domain used for signing — stored for re-verification.
    eip712Domain: jsonb("eip712_domain"),

    // Offchain timestamp + expiration from the attestation body.
    // Stored as bigint seconds (EAS uint64 time / expirationTime).
    attestationTime: bigint("attestation_time", { mode: "bigint" }).notNull(),
    expirationTime: bigint("expiration_time", { mode: "bigint" })
      .notNull()
      .default(0n),
    revocable: boolean("revocable").notNull(),
    // Parent attestation UID (if this attestation references another).
    refUid: varchar("ref_uid", { length: 66 }).notNull(),

    // Onchain promotion fields.
    txHash: varchar("tx_hash", { length: 66 }),
    blockNumber: bigint("block_number", { mode: "bigint" }),
    promotedAt: timestamp("promoted_at", { withTimezone: true }),

    // Revocation state.
    isRevoked: boolean("is_revoked").notNull().default(false),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokeTxHash: varchar("revoke_tx_hash", { length: 66 }),

    ...baseEntityFields,
  },
  (t) => [
    index("eas_attestation_schema_ref_idx").on(
      t.schemaUid,
      t.refType,
      t.refId
    ),
    index("eas_attestation_attester_idx").on(t.attester),
    index("eas_attestation_ref_idx").on(t.refType, t.refId),
  ]
)

export type EasAttestation = typeof easAttestation.$inferSelect
export type NewEasAttestation = typeof easAttestation.$inferInsert
