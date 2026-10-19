import { requireUser } from '../../utils/auth'
import { apiError } from '../../utils/http'
import { saveMedia } from '../../utils/media'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const parts = await readMultipartFormData(event)
  const file = parts?.find(part => part.name === 'file' && part.data?.length)
  if (!file?.data) apiError(400, 'Bestand ontbreekt')
  const mime = file.type || 'application/octet-stream'
  const isImage = mime.startsWith('image/')
  const isVideo = mime.startsWith('video/')
  if (!isImage && !isVideo) apiError(400, 'Alleen afbeeldingen en video\'s')
  const max = isVideo ? 80_000_000 : 8_000_000
  if (file.data.length > max) apiError(400, 'Bestand is te groot')
  const source = String(getQuery(event).source || 'upload')
  const assetId = await saveMedia({
    userId: user.id,
    bytes: file.data,
    mime,
    source: source === 'edited' ? 'edited' : 'upload',
    extension: extensionFromName(file.filename || '', mime),
  })
  return { id: assetId }
})

function extensionFromName(filename: string, mime: string) {
  const match = filename.match(/\.(png|jpe?g|webp|gif|mp4|mov|webm)$/i)
  const extension = match?.[1]
  if (extension) return `.${extension.toLowerCase().replace('jpeg', 'jpg')}`
  if (mime === 'image/png') return '.png'
  if (mime === 'image/jpeg') return '.jpg'
  if (mime === 'video/mp4') return '.mp4'
  return '.bin'
}
