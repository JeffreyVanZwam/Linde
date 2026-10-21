import { requireUser } from '../../utils/auth'
import { listSocialAccounts } from '../../utils/store'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const rows = await listSocialAccounts(user.id)
  return rows.map(row => ({
    id: row.id,
    platform: row.platform,
    externalId: row.externalId,
    displayName: row.displayName,
    lastSyncAt: row.lastSyncAt,
  }))
})
