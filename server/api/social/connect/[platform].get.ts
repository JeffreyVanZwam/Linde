import { isConnectProvider } from '~~/shared/platforms'
import { requireUser } from '../../../utils/auth'
import { apiError, id } from '../../../utils/http'
import { socialApp } from '../../../utils/social/apps'
import { linkedinAuthUrl } from '../../../utils/social/linkedin'
import { facebookAuthUrl, instagramAuthUrl } from '../../../utils/social/meta'
import { pinterestAuthUrl } from '../../../utils/social/pinterest'
import { tiktokAuthUrl } from '../../../utils/social/tiktok'
import { xAuthUrl, xVerifier } from '../../../utils/social/x'
import { youtubeAuthUrl } from '../../../utils/social/youtube'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const platform = getRouterParam(event, 'platform') || ''
  if (!isConnectProvider(platform)) apiError(404, 'Onbekend platform')
  const locale = getQuery(event).locale === 'en' ? 'en' : 'nl'
  const app = await socialApp(user.id, platform)
  const prefix = locale === 'en' ? '/en' : ''
  if (!app) {
    const message = platform === 'instagram'
      ? (locale === 'en'
        ? 'Save the Instagram App ID and Instagram App Secret first. They are in the Meta app under Instagram → Business login settings, and they are not the Facebook app ID.'
        : 'Sla eerst de Instagram App-ID en het Instagram App Secret op. Die staan in de Meta-app onder Instagram → Business login settings, en zijn niet de Facebook-app-ID.')
      : 'Sla eerst de app-gegevens op'
    return sendRedirect(event, `${prefix}/social/accounts?error=${encodeURIComponent(message)}`)
  }
  if (platform === 'instagram' && await usesMetaAppId(user.id, app.clientId)) {
    const message = locale === 'en'
      ? 'Instagram rejected the Facebook app ID. Enter the Instagram App ID and Instagram App Secret from the Meta app, under Instagram → Business login settings.'
      : 'Instagram weigert de Facebook-app-ID. Vul de Instagram App-ID en het Instagram App Secret in. Die staan in de Meta-app onder Instagram → Business login settings.'
    return sendRedirect(event, `${prefix}/social/accounts?error=${encodeURIComponent(message)}`)
  }
  const state = id()
  const verifier = xVerifier()
  setCookie(event, 'oauth_state', state, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 600 })
  setCookie(event, 'oauth_locale', locale, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 600 })
  setCookie(event, 'oauth_verifier', verifier, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 600 })
  const url = {
    linkedin: linkedinAuthUrl(state, app),
    facebook: facebookAuthUrl(state, app),
    instagram: instagramAuthUrl(state, app),
    youtube: youtubeAuthUrl(state, app),
    tiktok: tiktokAuthUrl(state, app),
    x: xAuthUrl(state, verifier, app),
    pinterest: pinterestAuthUrl(state, app),
  }[platform]
  return sendRedirect(event, url)
})

async function usesMetaAppId(userId: string, clientId: string) {
  if (process.env.META_APP_ID && clientId === process.env.META_APP_ID) return true
  const facebook = await socialApp(userId, 'facebook')
  return Boolean(facebook && facebook.clientId === clientId)
}
