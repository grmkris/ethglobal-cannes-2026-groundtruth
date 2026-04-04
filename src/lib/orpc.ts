"use client"

import { createORPCClient } from "@orpc/client"
import { RPCLink } from "@orpc/client/fetch"
import type { AppRouterClient } from "@/server/api/router"

const link = new RPCLink({
  url: `${typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/api/rpc`,
  fetch(url, opts) {
    return fetch(url, { ...opts, credentials: "include" })
  },
})

export const client: AppRouterClient = createORPCClient(link)
