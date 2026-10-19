import { eq } from 'drizzle-orm'
import { useDb } from '../../db/client'
import { mediaAssets } from '../../db/schema'
import { auth, sessionHeaders } from '../../utils/auth'
import { verifyValue } from '../../utils/crypto'
import { apiError } from '../../utils/http'
import { streamMedia } from '../../utils/media'

export default defineEventHandler(async (event) => {
  const assetId = getRouterParam(event, 'id')
  if (!assetId) apiError(400, 'Media ontbreekt')
  const asset = await useDb().query.mediaAssets.findFirst({ where: eq(mediaAssets.id, assetId) })
  if (!asset) apiError(404, 'Media niet gevonden')
  const session = await auth.api.getSession({ headers: sessionHeaders(event) })
  const exp = Number(getQuery(event).exp || 0)
  const sig = String(getQuery(event).sig || '')
  const signed = exp > Date.now() && verifyValue(`${assetId}.${exp}`, sig)
  if (session?.user?.id !== asset.userId && !signed) apiError(401, 'Geen toegang')
  setHeader(event, 'content-type', asset.mime)
  setHeader(event, 'cache-control', 'private, max-age=3600')
  return sendStream(event, streamMedia(asset.path))
})
