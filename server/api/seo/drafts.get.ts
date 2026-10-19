import { desc, eq } from 'drizzle-orm'
import { useDb } from '../../db/client'
import { articleDrafts } from '../../db/schema'
import { requireUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  return useDb().query.articleDrafts.findMany({
    where: eq(articleDrafts.userId, user.id),
    orderBy: desc(articleDrafts.updatedAt),
  })
})
