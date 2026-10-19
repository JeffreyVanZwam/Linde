import { desc, eq } from 'drizzle-orm'
import { useDb } from '../../db/client'
import { outreachCampaigns } from '../../db/schema'
import { requireUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  return useDb().query.outreachCampaigns.findMany({
    where: eq(outreachCampaigns.userId, user.id),
    orderBy: desc(outreachCampaigns.updatedAt),
  })
})
