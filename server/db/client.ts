import { mkdirSync } from 'node:fs'
import { createClient, type Client } from '@libsql/client'
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql'
import * as schema from './schema'

let client: Client | undefined
let database: LibSQLDatabase<typeof schema> | undefined

export function useSql(): Client {
  if (!client) {
    mkdirSync('.data', { recursive: true })
    const url = process.env.DATABASE_URL || 'file:.data/app.db'
    client = createClient({ url })
  }
  return client
}

export function useDb() {
  if (!database) {
    database = drizzle(useSql(), { schema })
  }
  return database
}
