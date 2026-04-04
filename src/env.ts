import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(1),
    AUTH_DOMAIN: z.string().min(1),
    WORLD_APP_ID: z.string().min(1),
    NODE_ENV: z.enum(["development", "production", "test"]),
    APP_URL: z.string().url(),
  },
  client: {
    NEXT_PUBLIC_REOWN_PROJECT_ID: z.string().min(1),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_REOWN_PROJECT_ID: process.env.NEXT_PUBLIC_REOWN_PROJECT_ID,
  },
})
