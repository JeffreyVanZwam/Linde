import type { ZodType } from 'zod'

export function apiError(statusCode: number, statusMessage: string): never {
  throw createError({ statusCode, statusMessage, message: statusMessage })
}

export function parseInput<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    apiError(400, result.error.issues[0]?.message || 'Ongeldige invoer')
  }
  return result.data
}

export function id() {
  return crypto.randomUUID()
}

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  }
  catch {
    return fallback
  }
}

export function appBaseUrl() {
  return (process.env.BETTER_AUTH_URL || 'http://localhost:3000').replace(/\/$/, '')
}
