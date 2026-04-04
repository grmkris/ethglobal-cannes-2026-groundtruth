import { createAuthClient } from "better-auth/react"
import { siweClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
  baseURL: "/api",
  plugins: [siweClient()],
})

export const { useSession, signOut } = authClient
