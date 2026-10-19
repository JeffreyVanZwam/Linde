import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { useDb } from '../../db/client'
import { socialAccounts } from '../../db/schema'
import { requireUser } from '../../utils/auth'
import { parseInput } from '../../utils/http'
import { syncAccount } from '../../utils/social/sync'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const input = parseInput(z.object({ accountId: z.string().optional() }), await readBody(event).catch(() => ({})))
  const db = useDb()
  const accounts = await db.query.socialAccounts.findMany({
    where: input.accountId
      ? and(eq(socialAccounts.userId, user.id), eq(socialAccounts.id, input.accountId))
      : eq(socialAccounts.userId, user.id),
  })
  const results = []
  for (const account of accounts) {
    results.push({ id: account.id, platform: account.platform, ...await syncAccount(account.id) })
  }
  return { results }
})
