import { relations } from "drizzle-orm"
import {
  user,
  session,
  account,
  walletAddress,
  worldIdVerification,
} from "./auth.db"

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session, { relationName: "userSessions" }),
  accounts: many(account, { relationName: "userAccounts" }),
  wallets: many(walletAddress, { relationName: "userWallets" }),
  worldIdVerifications: many(worldIdVerification, {
    relationName: "userWorldIdVerifications",
  }),
}))

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
    relationName: "userSessions",
  }),
}))

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
    relationName: "userAccounts",
  }),
}))

export const walletAddressRelations = relations(walletAddress, ({ one }) => ({
  user: one(user, {
    fields: [walletAddress.userId],
    references: [user.id],
    relationName: "userWallets",
  }),
}))

export const worldIdVerificationRelations = relations(
  worldIdVerification,
  ({ one }) => ({
    user: one(user, {
      fields: [worldIdVerification.userId],
      references: [user.id],
      relationName: "userWorldIdVerifications",
    }),
  })
)
