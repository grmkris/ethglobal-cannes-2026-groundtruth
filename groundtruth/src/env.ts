import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(1),
    AUTH_DOMAIN: z.string().min(1),
    WORLD_APP_ID: z.string().min(1),
    WORLD_RP_ID: z.string().startsWith("rp_"),
    WORLD_SIGNING_KEY: z.string().min(1),
    BLOB_READ_WRITE_TOKEN: z.string().min(1),
    NODE_ENV: z.enum(["development", "production", "test"]),
    APP_URL: z.string().url(),
    INFURA_PROJECT_ID: z.string().min(1),
    AGENT_PAY_TO_ADDRESS: z.string().min(1),
  },
  client: {
    NEXT_PUBLIC_REOWN_PROJECT_ID: z.string().min(1),
    NEXT_PUBLIC_WORLD_APP_ID: z.custom<`app_${string}`>(
      (val) => typeof val === "string" && val.startsWith("app_")
    ),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_REOWN_PROJECT_ID: process.env.NEXT_PUBLIC_REOWN_PROJECT_ID,
    NEXT_PUBLIC_WORLD_APP_ID: process.env.NEXT_PUBLIC_WORLD_APP_ID,
  },
})
