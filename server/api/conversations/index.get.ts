import { z } from 'zod'
import { chatModules } from '~~/shared/platforms'
import { requireBrand } from '../../utils/scope'
import { listConversations } from '../../utils/store'

export default defineEventHandler(async (event) => {
  const { user, brand } = await requireBrand(event)
  const query = z.object({ module: z.enum(chatModules).optional() }).parse(getQuery(event))
  return listConversations(user.id, brand.id, query.module)
})
