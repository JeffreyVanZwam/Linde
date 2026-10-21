import { isConnectProvider } from '~~/shared/platforms'
import { requireUser } from '../../../utils/auth'
import { apiError, id } from '../../../utils/http'
import { socialApp } from '../../../utils/social/apps'
import { linkedinAuthUrl } from '../../../utils/social/linkedin'
import { metaAuthUrl } from '../../../utils/social/meta'
import { tiktokAuthUrl } from '../../../utils/social/tiktok'
import { youtubeAuthUrl } from '../../../utils/social/youtube'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const platform = getRouterParam(event, 'platform') || ''
  if (!isConnectProvider(platform)) apiError(404, 'Onbekend platform')
  const locale = getQuery(event).locale === 'en' ? 'en' : 'nl'
  const app = await socialApp(user.id, platform)
  if (!app) {
    const prefix = locale === 'en' ? '/en' : ''
    return sendRedirect(event, `${prefix}/social/accounts?error=${encodeURIComponent('Sla eerst de app-gegevens op')}`)
  }
  const state = id()
  setCookie(event, 'oauth_state', state, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 600 })
  setCookie(event, 'oauth_locale', locale, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 600 })
  const url = {
    linkedin: linkedinAuthUrl(state, app),
    meta: metaAuthUrl(state, app),
    youtube: youtubeAuthUrl(state, app),
    tiktok: tiktokAuthUrl(state, app),
  }[platform]
  return sendRedirect(event, url)
})
