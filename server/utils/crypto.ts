import { createCipheriv, createDecipheriv, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

function secret() {
  const value = process.env.ENCRYPTION_KEY || process.env.BETTER_AUTH_SECRET || ''
  if (value.length < 16) {
    throw createError({ statusCode: 500, statusMessage: 'ENCRYPTION_KEY ontbreekt of is te kort' })
  }
  return value
}

function key() {
  return scryptSync(secret(), 'marketing-dashboard', 32)
}

export function encrypt(plain: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, encrypted]).toString('base64')
}

export function decrypt(payload: string) {
  const buffer = Buffer.from(payload, 'base64')
  const iv = buffer.subarray(0, 12)
  const tag = buffer.subarray(12, 28)
  const encrypted = buffer.subarray(28)
  const decipher = createDecipheriv('aes-256-gcm', key(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}

export function signValue(value: string) {
  return createHmac('sha256', secret()).update(value).digest('base64url')
}

export function verifyValue(value: string, signature: string) {
  const expected = signValue(value)
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  return a.length === b.length && timingSafeEqual(a, b)
}
