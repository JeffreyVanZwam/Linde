import { requireUser } from '../../utils/auth'
import { listSocialApps } from '../../utils/social/apps'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  return listSocialApps(user.id)
})
