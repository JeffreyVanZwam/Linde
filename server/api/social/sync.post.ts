import { z } from 'zod'
import { requireUser } from '../../utils/auth'
import { parseInput } from '../../utils/http'
import { syncAccount } from '../../utils/social/sync'
import { listSocialAccounts } from '../../utils/store'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const input = parseInput(z.object({ accountId: z.string().optional() }), await readBody(event).catch(() => ({})))
  const accounts = (await listSocialAccounts(user.id)).filter(account => !input.accountId || account.id === input.accountId)
  const results = []
  for (const account of accounts) {
    results.push({ id: account.id, platform: account.platform, ...await syncAccount(account.id) })
  }
  return { results }
})
