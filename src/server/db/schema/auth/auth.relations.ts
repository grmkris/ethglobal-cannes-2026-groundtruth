import { relations } from "drizzle-orm"
import {
  user,
  session,
  account,
  walletAddress,
  worldIdVerification,
} from "./auth.db"

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  wallets: many(walletAddress),
  worldIdVerifications: many(worldIdVerification),
}))

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}))

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}))

export const walletAddressRelations = relations(walletAddress, ({ one }) => ({
  user: one(user, { fields: [walletAddress.userId], references: [user.id] }),
}))

export const worldIdVerificationRelations = relations(
  worldIdVerification,
  ({ one }) => ({
    user: one(user, {
      fields: [worldIdVerification.userId],
      references: [user.id],
    }),
  })
)
