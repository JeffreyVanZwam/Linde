import { isConnectProvider } from '~~/shared/platforms'
import { requireUser } from '../../../utils/auth'
import { apiError } from '../../../utils/http'
import { upsertSocialAccount } from '../../../utils/social/accounts'
import { socialApp } from '../../../utils/social/apps'
import { linkedinExchange, linkedinOrganizations, linkedinProfile } from '../../../utils/social/linkedin'
import { instagramExchange, instagramProfile, metaAccounts, metaExchange, metaProfile } from '../../../utils/social/meta'
import { saveConnectPending, saveLinkedInPending } from '../../../utils/social/pending'
import { pinterestExchange, pinterestProfile } from '../../../utils/social/pinterest'
import { tiktokExchange, tiktokProfile } from '../../../utils/social/tiktok'
import { xExchange, xProfile } from '../../../utils/social/x'
import { youtubeChannel, youtubeExchange } from '../../../utils/social/youtube'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const platform = getRouterParam(event, 'platform') || ''
  if (!isConnectProvider(platform)) apiError(404, 'Onbekend platform')
  const query = getQuery(event)
  const code = String(query.code || '')
  const state = String(query.state || '')
  const expected = getCookie(event, 'oauth_state')
  const verifier = getCookie(event, 'oauth_verifier') || ''
  const locale = getCookie(event, 'oauth_locale') === 'en' ? 'en' : 'nl'
  deleteCookie(event, 'oauth_state', { path: '/' })
  deleteCookie(event, 'oauth_locale', { path: '/' })
  deleteCookie(event, 'oauth_verifier', { path: '/' })
  if (query.error) {
    if (!state || state !== expected) apiError(400, 'OAuth-state klopt niet')
    const description = String(query.error_description || query.error).replaceAll('&quot;', '"').slice(0, 300)
    return sendRedirect(event, accountsPath(locale, { error: description }))
  }
  if (!code || !state || state !== expected) apiError(400, 'OAuth-state klopt niet')
  const app = await socialApp(user.id, platform)
  if (!app) return sendRedirect(event, accountsPath(locale, { error: 'Sla eerst de app-gegevens op' }))
  if (platform === 'linkedin') {
    const token = await linkedinExchange(code, app)
    const profile = await linkedinProfile(token.accessToken)
    if (!profile.externalId) apiError(400, 'LinkedIn-profiel heeft geen id')
    const person = { platform: 'linkedin' as const, ...profile, ...token, meta: { authorType: 'person' } }
    try {
      const pages = await linkedinOrganizations(token.accessToken)
      if (!pages.length) {
        await upsertSocialAccount(user.id, person)
        return sendRedirect(event, accountsPath(locale, { connected: '1' }))
      }
      const pendingId = await saveLinkedInPending(user.id, {
        accessToken: token.accessToken,
        refreshToken: token.refreshToken || null,
        expiresAt: token.expiresAt ? token.expiresAt.toISOString() : null,
        options: [
          { externalId: profile.externalId, displayName: profile.displayName, authorType: 'person', platform: 'linkedin' },
          ...pages.map(page => ({ ...page, platform: 'linkedin' as const })),
        ],
      })
      return sendRedirect(event, accountsPath(locale, { pending: pendingId }))
    }
    catch (error) {
      await upsertSocialAccount(user.id, person)
      const message = error instanceof Error ? error.message : 'Bedrijfspagina\'s ophalen mislukte'
      return sendRedirect(event, accountsPath(locale, {
        connected: '1',
        error: `Je persoonlijke profiel is gekoppeld. Bedrijfspagina's konden niet worden geladen: ${message}`.slice(0, 300),
      }))
    }
  }
  else if (platform === 'facebook') {
    const token = await metaExchange(code, app)
    const profile = await metaProfile(token.accessToken)
    if (!profile.externalId) apiError(400, 'Facebook-profiel heeft geen id')
    let pages
    try {
      pages = await metaAccounts(token.accessToken, app, token.shortToken)
    }
    catch (error) {
      const message = error instanceof Error ? error.message : 'Bedrijfspagina\'s ophalen mislukte'
      return sendRedirect(event, accountsPath(locale, { error: message.slice(0, 300) }))
    }
    if (!pages.length) {
      return sendRedirect(event, accountsPath(locale, {
        error: 'Facebook stuurde geen bedrijfspagina terug, ook al was die in het venster gekozen. Controleer of je beheerder van de pagina bent en koppel opnieuw.',
      }))
    }
    const pendingId = await saveConnectPending(user.id, 'facebook', {
      accessToken: token.accessToken,
      refreshToken: null,
      expiresAt: token.expiresAt ? token.expiresAt.toISOString() : null,
      options: pages.flatMap((account) => {
        if (account.platform !== 'facebook') return []
        return [{
          platform: 'facebook' as const,
          externalId: account.externalId,
          displayName: account.displayName,
          authorType: 'organization' as const,
          accessToken: account.accessToken,
          pageId: account.meta?.pageId,
        }]
      }),
    })
    return sendRedirect(event, accountsPath(locale, { pending: pendingId }))
  }
  else if (platform === 'instagram') {
    const token = await instagramExchange(code, app)
    const profile = await instagramProfile(token.accessToken, token.userId)
    if (!profile.externalId) apiError(400, 'Instagram-account heeft geen id')
    await upsertSocialAccount(user.id, {
      platform: 'instagram',
      externalId: profile.externalId,
      displayName: profile.displayName,
      accessToken: token.accessToken,
      refreshToken: null,
      expiresAt: token.expiresAt,
      meta: { authorType: 'organization', auth: 'instagram' },
    })
  }
  else if (platform === 'youtube') {
    const token = await youtubeExchange(code, app)
    const channel = await youtubeChannel(token.accessToken)
    await upsertSocialAccount(user.id, {
      platform: 'youtube',
      externalId: channel.externalId,
      displayName: channel.displayName,
      ...token,
      meta: { uploadsPlaylistId: channel.uploadsPlaylistId },
    })
  }
  else if (platform === 'x') {
    if (!verifier) apiError(400, 'OAuth-verifier ontbreekt')
    const token = await xExchange(code, verifier, app)
    const profile = await xProfile(token.accessToken)
    if (!profile.externalId) apiError(400, 'X-profiel heeft geen id')
    await upsertSocialAccount(user.id, { platform: 'x', ...profile, ...token })
  }
  else if (platform === 'pinterest') {
    const token = await pinterestExchange(code, app)
    const profile = await pinterestProfile(token.accessToken)
    if (!profile.externalId) apiError(400, 'Pinterest-profiel heeft geen id')
    await upsertSocialAccount(user.id, {
      platform: 'pinterest',
      externalId: profile.externalId,
      displayName: profile.displayName,
      ...token,
      meta: { boardId: profile.boardId },
    })
  }
  else {
    const token = await tiktokExchange(code, app)
    const profile = await tiktokProfile(token.accessToken)
    await upsertSocialAccount(user.id, { platform: 'tiktok', ...profile, ...token })
  }
  return sendRedirect(event, accountsPath(locale, { connected: '1' }))
})

function accountsPath(locale: string, params: Record<string, string>) {
  const prefix = locale === 'en' ? '/en' : ''
  return `${prefix}/social/accounts?${new URLSearchParams(params)}`
}
