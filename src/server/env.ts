import { z } from "zod"

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  // Auth
  BETTER_AUTH_SECRET: z.string().min(1).default("dev-secret-change-in-prod"),
  AUTH_DOMAIN: z.string().default("localhost"),
  // World ID
  WORLD_APP_ID: z.string().optional(),
})

export const env = envSchema.parse(process.env)
