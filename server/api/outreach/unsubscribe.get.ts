import { and, eq, inArray } from 'drizzle-orm'
import { useDb } from '../../db/client'
import { outreachMessages, outreachRecipients } from '../../db/schema'
import { verifyValue } from '../../utils/crypto'

export default defineEventHandler(async (event) => {
  const id = String(getQuery(event).id || '')
  const token = String(getQuery(event).token || '')
  if (!id || !verifyValue(id, token)) {
    throw createError({ statusCode: 400, statusMessage: 'Ongeldige afmeldlink' })
  }
  const db = useDb()
  await db.update(outreachRecipients).set({ status: 'unsubscribed' }).where(eq(outreachRecipients.id, id))
  await db.update(outreachMessages).set({ status: 'cancelled' }).where(and(
    eq(outreachMessages.recipientId, id),
    inArray(outreachMessages.status, ['draft', 'approved', 'scheduled']),
  ))
  return { ok: true }
})
