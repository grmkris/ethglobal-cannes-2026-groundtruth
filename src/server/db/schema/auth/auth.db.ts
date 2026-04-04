import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core"
import {
  type UserId,
  type SessionId,
  type AccountId,
  type VerificationId,
  type WalletAddressId,
  type WorldIdVerificationId,
  typeIdGenerator,
} from "@/lib/typeid"
import { baseEntityFields, typeId } from "../../utils"

// --- Better Auth: user ---
export const user = pgTable("user", {
  id: typeId("user", "id")
    .primaryKey()
    .$defaultFn(() => typeIdGenerator("user"))
    .$type<UserId>(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
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
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: typeId("user", "user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" })
      .$type<UserId>(),
    ...baseEntityFields,
  },
  (t) => [index("session_userId_idx").on(t.userId)]
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
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
      mode: "date",
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
      mode: "date",
    }),
    scope: text("scope"),
    password: text("password"),
    ...baseEntityFields,
  },
  (t) => [index("account_userId_idx").on(t.userId)]
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
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    ...baseEntityFields,
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)]
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
    chainId: integer("chain_id").notNull(),
    isPrimary: boolean("is_primary").default(false).notNull(),
    ...baseEntityFields,
  },
  (t) => [
    index("wallet_userId_idx").on(t.userId),
    index("wallet_address_idx").on(t.address),
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
