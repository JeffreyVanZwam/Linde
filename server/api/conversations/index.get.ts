import { z } from 'zod'
import { chatModules } from '~~/shared/platforms'
import { requireUser } from '../../utils/auth'
import { listConversations } from '../../utils/store'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const query = z.object({ module: z.enum(chatModules).optional() }).parse(getQuery(event))
  return listConversations(user.id, query.module)
})
