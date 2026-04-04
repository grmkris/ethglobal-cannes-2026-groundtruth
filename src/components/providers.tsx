"use client"

import { NuqsAdapter } from "nuqs/adapters/next/app"
import { ThemeProvider } from "@/components/theme-provider"
import { Web3Provider } from "@/components/web3-provider"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NuqsAdapter>
      <ThemeProvider>
        <Web3Provider>{children}</Web3Provider>
      </ThemeProvider>
    </NuqsAdapter>
  )
}
