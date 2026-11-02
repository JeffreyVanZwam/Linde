import { isConnectProvider } from '~~/shared/platforms'
import { requireUser } from '../../../utils/auth'
import { apiError } from '../../../utils/http'
import { deleteSocialApp, listSocialApps } from '../../../utils/social/apps'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const provider = getRouterParam(event, 'provider') || ''
  if (!isConnectProvider(provider)) apiError(404, 'Onbekend platform')
  await deleteSocialApp(user.id, provider)
  return listSocialApps(user.id)
})
