import { requireUser } from '../../utils/auth'
import { verifyValue } from '../../utils/crypto'
import { apiError } from '../../utils/http'
import { fetchMedia } from '../../utils/media'
import { findMedia } from '../../utils/store'

export default defineEventHandler(async (event) => {
  const assetId = getRouterParam(event, 'id')
  if (!assetId) apiError(400, 'Media ontbreekt')
  const asset = await findMedia(assetId)
  if (!asset) apiError(404, 'Media niet gevonden')
  let userId = ''
  try {
    userId = (await requireUser(event)).id
  }
  catch {
    userId = ''
  }
  const exp = Number(getQuery(event).exp || 0)
  const sig = String(getQuery(event).sig || '')
  const signed = exp > Date.now() && verifyValue(`${assetId}.${exp}`, sig)
  if (userId !== asset.userId && !signed) apiError(401, 'Geen toegang')
  const thumb = String(getQuery(event).thumb || '')
  const allowed = thumb === '200x200' || thumb === '800x0' ? thumb : undefined
  const opened = await fetchMedia(assetId, allowed)
  if (!opened) apiError(404, 'Media niet gevonden')
  setHeader(event, 'content-type', opened.contentType)
  setHeader(event, 'cache-control', 'private, max-age=3600')
  return Buffer.from(await new Response(opened.body).arrayBuffer())
})
