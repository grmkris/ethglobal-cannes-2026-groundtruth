"use client"

import { NuqsAdapter } from "nuqs/adapters/next/app"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"
import { ThemeProvider } from "@/components/theme-provider"

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
          },
        },
      })
  )

  return (
    <NuqsAdapter>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </ThemeProvider>
    </NuqsAdapter>
  )
}
