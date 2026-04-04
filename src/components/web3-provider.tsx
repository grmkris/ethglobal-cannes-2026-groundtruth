"use client"

import { type ReactNode } from "react"
import { createAppKit } from "@reown/appkit/react"
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi"
import { WagmiProvider } from "wagmi"
import { mainnet, base } from "wagmi/chains"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { env } from "@/env"

const projectId = env.NEXT_PUBLIC_REOWN_PROJECT_ID

const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks: [mainnet, base],
})

if (projectId) {
  createAppKit({
    adapters: [wagmiAdapter],
    projectId,
    networks: [mainnet, base],
    metadata: {
      name: "Ground Truth",
      description: "Verified intelligence map",
      url: "https://groundtruth.app",
      icons: [],
    },
    features: {
      analytics: false,
    },
  })
}

const queryClient = new QueryClient()

export function Web3Provider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}
