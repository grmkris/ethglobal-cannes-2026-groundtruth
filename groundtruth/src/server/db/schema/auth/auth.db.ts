import {
  boolean,
  index,
  integer,
  primaryKey,
  uniqueIndex,
  pgTable,
  text,
} from "drizzle-orm/pg-core"
import {
  type UserId,
  type SessionId,
  type AccountId,
  type VerificationId,
  type WalletAddressId,
  type WorldIdVerificationId,
  type AgentWalletId,
  type AgentProfileId,
  type PaymentLedgerId,
  typeIdGenerator,
} from "@/lib/typeid"
import { baseEntityFields, createTimestampField, typeId } from "../../utils"

// --- Better Auth: user ---
export const user = pgTable("user", {
  id: typeId("user", "id")
    .primaryKey()
    .$defaultFn(() => typeIdGenerator("user"))
    .$type<UserId>(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified")
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  // Ground Truth extension
  worldIdVerified: boolean("world_id_verified").default(false).notNull(),
  ...baseEntityFields,
})

// --- Better Auth: session ---
export const session = pgTable(
  "session",
  {
    id: typeId("session", "id")
      .primaryKey()
      .$defaultFn(() => typeIdGenerator("session"))
      .$type<SessionId>(),
    expiresAt: createTimestampField("expires_at").notNull(),
    token: text("token").notNull().unique(),
    ...baseEntityFields,
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: typeId("user", "user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" })
      .$type<UserId>(),
  },
  (table) => [index("session_userId_idx").on(table.userId)]
)

// --- Better Auth: account ---
export const account = pgTable(
  "account",
  {
    id: typeId("account", "id")
      .primaryKey()
      .$defaultFn(() => typeIdGenerator("account"))
      .$type<AccountId>(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: typeId("user", "user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" })
      .$type<UserId>(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: createTimestampField("access_token_expires_at"),
    refreshTokenExpiresAt: createTimestampField("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    ...baseEntityFields,
  },
  (table) => [index("account_userId_idx").on(table.userId)]
)

// --- Better Auth: verification ---
export const verification = pgTable(
  "verification",
  {
    id: typeId("verification", "id")
      .primaryKey()
      .$defaultFn(() => typeIdGenerator("verification"))
      .$type<VerificationId>(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: createTimestampField("expires_at").notNull(),
    createdAt: createTimestampField("created_at").$defaultFn(() => new Date()),
    updatedAt: createTimestampField("updated_at").$defaultFn(() => new Date()),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)]
)

// --- Better Auth SIWE: walletAddress ---
export const walletAddress = pgTable(
  "wallet_address",
  {
    id: typeId("walletAddress", "id")
      .primaryKey()
      .$defaultFn(() => typeIdGenerator("walletAddress"))
      .$type<WalletAddressId>(),
    userId: typeId("user", "user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" })
      .$type<UserId>(),
    address: text("address").notNull(),
    chainId: text("chain_id").notNull(),
    isPrimary: boolean("is_primary")
      .$defaultFn(() => false)
      .notNull(),
    ...baseEntityFields,
  },
  (table) => [
    index("walletAddress_userId_idx").on(table.userId),
    uniqueIndex("walletAddress_address_idx").on(table.address),
  ]
)

// --- Ground Truth: AgentKit nonce replay protection ---
export const agentkitNonce = pgTable("agentkit_nonce", {
  nonce: text("nonce").primaryKey(),
  createdAt: createTimestampField("created_at").defaultNow().notNull(),
})

// --- Ground Truth: AgentKit usage tracking (free-trial mode, time-windowed) ---
// Composite PK on (humanId, endpoint, windowStart) so concurrent upserts for
// the same time window collapse to a single row instead of racing.
export const agentkitUsage = pgTable(
  "agentkit_usage",
  {
    endpoint: text("endpoint").notNull(),
    humanId: text("human_id").notNull(),
    usageCount: integer("usage_count").default(0).notNull(),
    windowStart: createTimestampField("window_start").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.humanId, table.endpoint, table.windowStart] }),
  ]
)

// --- Ground Truth: Payment ledger (Arc Nanopayments tracking) ---
export const paymentLedger = pgTable(
  "payment_ledger",
  {
    id: typeId("paymentLedger", "id")
      .primaryKey()
      .$defaultFn(() => typeIdGenerator("paymentLedger"))
      .$type<PaymentLedgerId>(),
    payerAddress: text("payer_address").notNull(),
    route: text("route").notNull(),
    amountUsd: text("amount_usd").notNull(),
    network: text("network"),
    category: text("category"),
    createdAt: createTimestampField("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("paymentLedger_payer_idx").on(table.payerAddress),
    index("paymentLedger_category_idx").on(table.category),
  ]
)

// --- Ground Truth: Agent wallet linking ---
export const agentWallet = pgTable(
  "agent_wallet",
  {
    id: typeId("agentWallet", "id")
      .primaryKey()
      .$defaultFn(() => typeIdGenerator("agentWallet"))
      .$type<AgentWalletId>(),
    userId: typeId("user", "user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" })
      .$type<UserId>(),
    address: text("address").notNull().unique(),
    ...baseEntityFields,
  },
  (table) => [
    index("agentWallet_userId_idx").on(table.userId),
  ]
)

// --- Ground Truth: World ID verification ---
export const worldIdVerification = pgTable("world_id_verification", {
  id: typeId("worldIdVerification", "id")
    .primaryKey()
    .$defaultFn(() => typeIdGenerator("worldIdVerification"))
    .$type<WorldIdVerificationId>(),
  nullifierHash: text("nullifier_hash").notNull().unique(),
  userId: typeId("user", "user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" })
    .$type<UserId>(),
  ...baseEntityFields,
})

// --- Ground Truth: Agent ENS + ERC-8004 profile ---
export const agentProfile = pgTable(
  "agent_profile",
  {
    id: typeId("agentProfile", "id")
      .primaryKey()
      .$defaultFn(() => typeIdGenerator("agentProfile"))
      .$type<AgentProfileId>(),
    userId: typeId("user", "user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" })
      .$type<UserId>(),
    agentWalletId: typeId("agentWallet", "agent_wallet_id")
      .notNull()
      .references(() => agentWallet.id, { onDelete: "cascade" })
      .$type<AgentWalletId>(),
    // ENS identity
    ensName: text("ens_name").notNull(), // e.g. "monitor.kris0.eth"
    label: text("label").notNull(), // e.g. "monitor"
    parentEnsName: text("parent_ens_name").notNull(), // e.g. "kris0.eth"
    // Agent metadata
    mandate: text("mandate").notNull(),
    sources: text("sources").notNull(),
    // ERC-8004 on-chain identity
    erc8004AgentId: text("erc8004_agent_id"), // set after TX3 mint
    // Registration progress (0 = created, 1-4 = tx steps completed)
    registrationStep: integer("registration_step").default(0).notNull(),
    // Agent wallet on-chain link (EIP-712 signature for setAgentWallet)
    walletLinkSignature: text("wallet_link_signature"),
    walletLinkDeadline: text("wallet_link_deadline"),
    ...baseEntityFields,
  },
  (table) => [
    index("agentProfile_userId_idx").on(table.userId),
    uniqueIndex("agentProfile_ensName_idx").on(table.ensName),
  ]
)
