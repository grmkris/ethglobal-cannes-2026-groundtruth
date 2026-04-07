import { getAddress } from "viem"
import { UserId } from "@/lib/typeid"
import { fetchReownIdentity } from "@/lib/reown-identity"
import { authedProcedure } from "../api"

const ADDRESS_RX = /^0x[a-fA-F0-9]{40}$/

export const authRouter = {
  /**
   * Re-resolve the signed-in user's primary wallet address through Reown's
   * Identity API and update `user.name` / `user.image` if they've drifted.
   *
   * Idempotent and cheap — safe to call once per session from the client. The
   * SIWE plugin only runs `ensLookup` at signup, so without this procedure a
   * user whose ENS name was set after signup (or whose Infura call flaked at
   * signup time) would see their `0x…` address everywhere `user.name` is
   * read (chat author, event creator, agent subname gating).
   */
  refreshIdentity: authedProcedure.handler(async ({ context }) => {
    const userId = UserId.parse(context.session.user.id)
    context.log.set({ procedure: "auth.refreshIdentity", userId })

    const address = await context.authService.getPrimaryWalletAddress({
      userId,
    })
    if (!address) return { name: null, avatar: null, updated: false }

    const identity = await fetchReownIdentity(getAddress(address))

    const currentName = context.session.user.name
    const currentImage = context.session.user.image ?? null
    const stale = ADDRESS_RX.test(currentName)
    const nameChanged = !!identity.name && identity.name !== currentName
    const imageChanged = !!identity.avatar && identity.avatar !== currentImage

    if (nameChanged || imageChanged || (stale && identity.name)) {
      const nextName = identity.name ?? currentName
      const nextImage = identity.avatar ?? currentImage
      await context.authService.updateUserProfile({
        userId,
        name: nextName,
        image: nextImage,
      })
      context.log.set({ identityUpdated: true })
      return { name: nextName, avatar: nextImage, updated: true }
    }

    return { name: currentName, avatar: currentImage, updated: false }
  }),
}
