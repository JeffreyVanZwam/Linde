import { getRequestHeaders, type H3Event } from 'h3'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { useDb } from '../db/client'
import * as schema from '../db/schema'

export const auth = betterAuth({
  database: drizzleAdapter(useDb(), {
    provider: 'sqlite',
    schema,
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  trustedOrigins: [process.env.BETTER_AUTH_URL || 'http://localhost:3000'],
})

export function sessionHeaders(event: H3Event) {
  const headers = new Headers()
  for (const [key, value] of Object.entries(getRequestHeaders(event))) {
    if (value) headers.set(key, value)
  }
  return headers
}

export async function requireUser(event: H3Event) {
  const session = await auth.api.getSession({ headers: sessionHeaders(event) })
  if (!session?.user) {
    throw createError({ statusCode: 401, statusMessage: 'Niet ingelogd' })
  }
  return session.user
}
