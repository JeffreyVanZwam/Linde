import { requireUser } from '../../utils/auth'
import { parseJson } from '../../utils/http'
import { listSocialAccounts } from '../../utils/store'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const rows = await listSocialAccounts(user.id)
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
