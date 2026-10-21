import { requireUser } from '../../../../utils/auth'
import { deleteLinkedInPending } from '../../../../utils/social/pending'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const pendingId = getRouterParam(event, 'id') || ''
  await deleteLinkedInPending(user.id, pendingId)
  return { ok: true }
})
