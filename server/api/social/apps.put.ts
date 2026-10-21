import { z } from 'zod'
import { connectProviders } from '~~/shared/platforms'
import { requireUser } from '../../utils/auth'
import { parseInput } from '../../utils/http'
import { listSocialApps, saveSocialApp, tiktokPrivacyLevels } from '../../utils/social/apps'

const schema = z.object({
  provider: z.enum(connectProviders),
  clientId: z.string().trim().min(1),
  clientSecret: z.string().trim().min(1).optional(),
  privacy: z.enum(tiktokPrivacyLevels).optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const input = parseInput(schema, await readBody(event))
  await saveSocialApp(user.id, input)
  return listSocialApps(user.id)
})
