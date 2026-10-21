import { eq } from 'drizzle-orm'
import { useDb } from '../../db/client'
import { socialAccounts } from '../../db/schema'
import { requireUser } from '../../utils/auth'
import { parseJson } from '../../utils/http'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const rows = await useDb().query.socialAccounts.findMany({ where: eq(socialAccounts.userId, user.id) })
  return rows.map((row) => {
    const meta = parseJson<Record<string, string>>(row.metaJson, {})
    return {
      id: row.id,
      platform: row.platform,
      externalId: row.externalId,
      displayName: row.displayName,
      authorType: meta.authorType === 'organization' || meta.authorType === 'person'
        ? meta.authorType
        : row.platform === 'facebook' || row.platform === 'instagram'
          ? 'organization'
          : row.platform === 'linkedin'
            ? 'person'
            : null,
      lastSyncAt: row.lastSyncAt,
    }
  })
})
