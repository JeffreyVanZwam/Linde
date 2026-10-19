import { and, desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { chatModules } from '~~/shared/platforms'
import { useDb } from '../../db/client'
import { conversations } from '../../db/schema'
import { requireUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const query = z.object({ module: z.enum(chatModules).optional() }).parse(getQuery(event))
  return useDb().query.conversations.findMany({
    where: query.module
      ? and(eq(conversations.userId, user.id), eq(conversations.module, query.module))
      : eq(conversations.userId, user.id),
    orderBy: desc(conversations.updatedAt),
  })
})
