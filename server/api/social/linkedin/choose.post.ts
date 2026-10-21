import { z } from 'zod'
import { requireUser } from '../../../utils/auth'
import { apiError, parseInput } from '../../../utils/http'
import { upsertSocialAccount } from '../../../utils/social/accounts'
import { deleteLinkedInPending, readLinkedInPending } from '../../../utils/social/pending'

const schema = z.object({
  pendingId: z.string().min(1),
  externalId: z.string().min(1),
  platform: z.enum(['linkedin', 'facebook', 'instagram']).optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const input = parseInput(schema, await readBody(event))
  const { payload } = await readLinkedInPending(user.id, input.pendingId)
  const choice = payload.options.find(option => option.externalId === input.externalId && (!input.platform || option.platform === input.platform))
  if (!choice) apiError(400, 'Kies een van de getoonde accounts')
  const platform = choice.platform || 'linkedin'
  const accountId = await upsertSocialAccount(user.id, {
    platform,
    externalId: choice.externalId,
    displayName: choice.displayName,
    accessToken: choice.accessToken || payload.accessToken,
    refreshToken: payload.refreshToken,
    expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : null,
    meta: {
      authorType: choice.authorType,
      ...(choice.pageId ? { pageId: choice.pageId } : {}),
    },
  })
  await deleteLinkedInPending(user.id, input.pendingId)
  return { id: accountId }
})
