import { requireUser } from '../../../utils/auth'
import { apiError } from '../../../utils/http'
import { deletePosts, deleteSocialAccount, deleteTargets, findSocialAccount, listTargetsForAccount, listTargetsForPosts } from '../../../utils/store'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const accountId = getRouterParam(event, 'id')
  if (!accountId) apiError(400, 'Account ontbreekt')
  const account = await findSocialAccount(accountId)
  if (!account || account.userId !== user.id) apiError(404, 'Account niet gevonden')
  const targets = await listTargetsForAccount(account.id)
  await deleteTargets(targets.map(target => target.id))
  if (targets.length) {
    const postIds = [...new Set(targets.map(target => target.postId))]
    const remaining = await listTargetsForPosts(postIds)
    const stillUsed = new Set(remaining.map(target => target.postId))
    const orphans = postIds.filter(postId => !stillUsed.has(postId))
    if (orphans.length) await deletePosts(orphans)
  }
  await deleteSocialAccount(account.id)
  return { ok: true }
})
