import { handle } from "hono/vercel"
import { createDb } from "@/server/db/db"
import { createApi } from "@/server/create-api"
import { env } from "@/env"

const db = createDb({ databaseUrl: env.DATABASE_URL })
const { app } = createApi({ db })

export const GET = handle(app)
export const POST = handle(app)
