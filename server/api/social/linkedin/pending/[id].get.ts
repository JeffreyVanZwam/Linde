import { requireUser } from '../../../../utils/auth'
import { readLinkedInPending } from '../../../../utils/social/pending'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const pendingId = getRouterParam(event, 'id') || ''
  const { payload } = await readLinkedInPending(user.id, pendingId)
  return {
    id: pendingId,
    options: payload.options.map(option => ({
      externalId: option.externalId,
      displayName: option.displayName,
      authorType: option.authorType,
      platform: option.platform || 'linkedin',
    })),
  }
})
