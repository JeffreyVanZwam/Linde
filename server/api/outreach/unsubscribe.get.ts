import { verifyValue } from '../../utils/crypto'
import { cancelOpenMessages, updateRecipient } from '../../utils/store'

export default defineEventHandler(async (event) => {
  const id = String(getQuery(event).id || '')
  const token = String(getQuery(event).token || '')
  if (!id || !verifyValue(id, token)) {
    throw createError({ statusCode: 400, statusMessage: 'Ongeldige afmeldlink' })
  }
  await updateRecipient(id, { status: 'unsubscribed' })
  await cancelOpenMessages(id)
  return { ok: true }
})
