import { isConnectProvider } from '~~/shared/platforms'
import { requireUser } from '../../../utils/auth'
import { apiError, id } from '../../../utils/http'
import { linkedinAuthUrl } from '../../../utils/social/linkedin'
import { metaAuthUrl } from '../../../utils/social/meta'
import { tiktokAuthUrl } from '../../../utils/social/tiktok'
import { youtubeAuthUrl } from '../../../utils/social/youtube'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const platform = getRouterParam(event, 'platform') || ''
  if (!isConnectProvider(platform)) apiError(404, 'Onbekend platform')
  const config = useRuntimeConfig()
  const ready = {
    linkedin: config.linkedinClientId && config.linkedinClientSecret,
    meta: config.metaAppId && config.metaAppSecret,
    youtube: config.googleClientId && config.googleClientSecret,
    tiktok: config.tiktokClientKey && config.tiktokClientSecret,
  }
  if (!ready[platform]) apiError(400, `Zet de ${platform}-sleutels in .env`)
  const state = id()
  const locale = getQuery(event).locale === 'en' ? 'en' : 'nl'
  setCookie(event, 'oauth_state', state, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 600 })
  setCookie(event, 'oauth_locale', locale, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 600 })
  const url = {
    linkedin: linkedinAuthUrl(state),
    meta: metaAuthUrl(state),
    youtube: youtubeAuthUrl(state),
    tiktok: tiktokAuthUrl(state),
  }[platform]
  return sendRedirect(event, url)
})
