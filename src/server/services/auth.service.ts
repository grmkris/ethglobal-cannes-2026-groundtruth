import { eq } from "drizzle-orm"
import { log } from "@/lib/evlog"
import type { Database } from "../db/db"
import { user, worldIdVerification } from "../db/schema/schema"
import type { UserId } from "@/lib/typeid"

export function createAuthService(props: { db: Database }) {
  const { db } = props

  async function verifyWorldId(params: {
    userId: UserId
    nullifierHash: string
  }) {
    const { userId, nullifierHash } = params
    log.info({ msg: "Storing World ID verification", userId, service: "auth" })

    await db
      .insert(worldIdVerification)
      .values({ nullifierHash, userId })
      .onConflictDoNothing()

    await db
      .update(user)
      .set({ worldIdVerified: true })
      .where(eq(user.id, userId))

    log.info({ msg: "World ID verified successfully", userId, service: "auth" })
  }

  async function isWorldIdVerified(params: {
    userId: UserId
  }): Promise<boolean> {
    const result = await db.query.user.findFirst({
      where: (u, { eq }) => eq(u.id, params.userId),
      columns: { worldIdVerified: true },
    })
    return result?.worldIdVerified ?? false
  }

  async function getUserByHumanId(params: {
    humanId: string
  }): Promise<UserId | null> {
    const row = await db.query.worldIdVerification.findFirst({
      where: (v, { eq }) => eq(v.nullifierHash, params.humanId),
      columns: { userId: true },
    })
    return row?.userId ?? null
  }

  return { verifyWorldId, isWorldIdVerified, getUserByHumanId }
}

export type AuthService = ReturnType<typeof createAuthService>
