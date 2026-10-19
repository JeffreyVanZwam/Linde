import { and, eq, inArray } from 'drizzle-orm'
import { useDb } from '../../../db/client'
import { socialAccounts, socialPostTargets, socialPosts } from '../../../db/schema'
import { requireUser } from '../../../utils/auth'
import { apiError } from '../../../utils/http'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const accountId = getRouterParam(event, 'id')
  if (!accountId) apiError(400, 'Account ontbreekt')
  const db = useDb()
  const account = await db.query.socialAccounts.findFirst({
    where: and(eq(socialAccounts.id, accountId), eq(socialAccounts.userId, user.id)),
  })
  if (!account) apiError(404, 'Account niet gevonden')
  const targets = await db.query.socialPostTargets.findMany({ where: eq(socialPostTargets.accountId, account.id) })
  await db.delete(socialPostTargets).where(eq(socialPostTargets.accountId, account.id))
  if (targets.length) {
    const postIds = [...new Set(targets.map(target => target.postId))]
    const remaining = await db.query.socialPostTargets.findMany({
      where: inArray(socialPostTargets.postId, postIds),
    })
    const stillUsed = new Set(remaining.map(target => target.postId))
    const orphans = postIds.filter(postId => !stillUsed.has(postId))
    if (orphans.length) await db.delete(socialPosts).where(inArray(socialPosts.id, orphans))
  }
  await db.delete(socialAccounts).where(eq(socialAccounts.id, account.id))
  return { ok: true }
})
