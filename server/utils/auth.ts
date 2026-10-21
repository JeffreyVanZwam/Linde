import type { H3Event } from 'h3'
import { createPb } from './pb'
import { apiError } from './http'

export type AuthUser = {
  id: string
  name: string
  email: string
  role: 'admin' | 'member'
}

const cookieName = 'pb_auth'

export function setAuthCookie(event: H3Event, token: string) {
  setCookie(event, cookieName, token, {
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 14,
  })
}

export function clearAuthCookie(event: H3Event) {
  deleteCookie(event, cookieName, { path: '/' })
}

export function toAuthUser(record: { id: string, email?: string, name?: string, role?: string }): AuthUser {
  return {
    id: record.id,
    email: record.email || '',
    name: typeof record.name === 'string' && record.name ? record.name : record.email || '',
    role: record.role === 'admin' ? 'admin' : 'member',
  }
}

export async function requireUser(event: H3Event): Promise<AuthUser> {
  const token = getCookie(event, cookieName)
  if (!token) apiError(401, 'Niet ingelogd')
  const pb = createPb()
  pb.authStore.save(token)
  try {
    const auth = await pb.collection('users').authRefresh()
    return toAuthUser(auth.record)
  }
  catch {
    apiError(401, 'Niet ingelogd')
  }
}

export async function requireAdmin(event: H3Event) {
  const user = await requireUser(event)
  if (user.role !== 'admin') apiError(403, 'Alleen beheerders')
  return user
}
