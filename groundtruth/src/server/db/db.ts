import type { Logger as DrizzleLogger } from "drizzle-orm"
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres"
import pg from "pg"
import * as DB_SCHEMA from "./schema/schema"

export { DB_SCHEMA }
export type Database = NodePgDatabase<typeof DB_SCHEMA>

export function createDb(props: {
  databaseUrl: string
  logger?: DrizzleLogger
}): Database {
  const pool = new pg.Pool({
    connectionString: props.databaseUrl,
  })
  return drizzle(pool, {
    schema: DB_SCHEMA,
    logger: props.logger,
  })
}

export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0]
export type DbOrTx = Database | Transaction
