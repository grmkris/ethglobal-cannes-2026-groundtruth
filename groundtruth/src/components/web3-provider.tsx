"use client"

import { type ReactNode } from "react"
import { createAppKit } from "@reown/appkit/react"
import { WagmiProvider } from "wagmi"
import { QueryClientProvider } from "@tanstack/react-query"
import { getQueryClient } from "@/lib/query-client"
import {
  wagmiAdapter,
  wagmiConfig,
  projectId,
  networks,
} from "@/lib/wagmi-config"
import { siweConfig } from "@/lib/siwe-config"

if (projectId) {
  createAppKit({
    adapters: [wagmiAdapter],
    projectId,
    networks: [...networks],
    metadata: {
      name: "Ground Truth",
      description: "Verified intelligence map",
      url: "https://groundtruth.grm.wtf",
      icons: [],
    },
    features: {
      analytics: false,
    },
    siweConfig,
  })
}

export function Web3Provider({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient()

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}
