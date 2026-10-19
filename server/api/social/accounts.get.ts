import { eq } from 'drizzle-orm'
import { useDb } from '../../db/client'
import { socialAccounts } from '../../db/schema'
import { requireUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const rows = await useDb().query.socialAccounts.findMany({ where: eq(socialAccounts.userId, user.id) })
  return rows.map(row => ({
    id: row.id,
    platform: row.platform,
    externalId: row.externalId,
    displayName: row.displayName,
    lastSyncAt: row.lastSyncAt,
  }))
})
