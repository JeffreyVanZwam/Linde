import { isConnectProvider } from '~~/shared/platforms'
import { requireUser } from '../../../utils/auth'
import { apiError } from '../../../utils/http'
import { upsertSocialAccount } from '../../../utils/social/accounts'
import { linkedinExchange, linkedinProfile } from '../../../utils/social/linkedin'
import { metaAccounts, metaExchange } from '../../../utils/social/meta'
import { tiktokExchange, tiktokProfile } from '../../../utils/social/tiktok'
import { youtubeChannel, youtubeExchange } from '../../../utils/social/youtube'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const platform = getRouterParam(event, 'platform') || ''
  if (!isConnectProvider(platform)) apiError(404, 'Onbekend platform')
  const query = getQuery(event)
  const code = String(query.code || '')
  const state = String(query.state || '')
  const expected = getCookie(event, 'oauth_state')
  const locale = getCookie(event, 'oauth_locale') === 'en' ? 'en' : 'nl'
  deleteCookie(event, 'oauth_state', { path: '/' })
  deleteCookie(event, 'oauth_locale', { path: '/' })
  if (!code || !state || state !== expected) apiError(400, 'OAuth-state klopt niet')
  if (platform === 'linkedin') {
    const token = await linkedinExchange(code)
    const profile = await linkedinProfile(token.accessToken)
    await upsertSocialAccount(user.id, { platform: 'linkedin', ...profile, ...token })
  }
  else if (platform === 'meta') {
    const token = await metaExchange(code)
    const accounts = await metaAccounts(token.accessToken)
    if (!accounts.length) apiError(400, 'Geen Facebook-pagina gevonden')
    for (const account of accounts) await upsertSocialAccount(user.id, account)
  }
  else if (platform === 'youtube') {
    const token = await youtubeExchange(code)
    const channel = await youtubeChannel(token.accessToken)
    await upsertSocialAccount(user.id, {
      platform: 'youtube',
      externalId: channel.externalId,
      displayName: channel.displayName,
      ...token,
      meta: { uploadsPlaylistId: channel.uploadsPlaylistId },
    })
  }
  else {
    const token = await tiktokExchange(code)
    const profile = await tiktokProfile(token.accessToken)
    await upsertSocialAccount(user.id, { platform: 'tiktok', ...profile, ...token })
  }
  const prefix = locale === 'en' ? '/en' : ''
  return sendRedirect(event, `${prefix}/social/accounts?connected=1`)
})
