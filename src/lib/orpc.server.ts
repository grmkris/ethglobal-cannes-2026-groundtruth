import { createORPCClient } from "@orpc/client"
import { RPCLink } from "@orpc/client/fetch"
import { headers } from "next/headers"
import type { AppRouterClient } from "@/server/api/router"
import { env } from "@/server/env"

const serverLink = new RPCLink({
  url: `${env.APP_URL}/api/rpc`,
  headers: async () => Object.fromEntries(await headers()),
  fetch(url, opts) {
    return fetch(url, { ...opts, credentials: "include" })
  },
})

export const serverClient: AppRouterClient = createORPCClient(serverLink)
