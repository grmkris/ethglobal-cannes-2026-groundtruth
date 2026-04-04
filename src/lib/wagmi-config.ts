"use client"

import { WagmiAdapter } from "@reown/appkit-adapter-wagmi"
import { mainnet, base } from "wagmi/chains"
import { env } from "@/env"

export const projectId = env.NEXT_PUBLIC_REOWN_PROJECT_ID
export const networks = [mainnet, base] as const
export const chainIds = networks.map((n) => n.id)

export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks: [...networks],
})

export const wagmiConfig = wagmiAdapter.wagmiConfig
