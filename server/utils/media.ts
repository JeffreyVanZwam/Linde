import { extname } from 'node:path'
import { createRecord, isMissing, useAdminPb } from './pb'
import { mapMedia, type MediaRow } from './rows'
import { ensureFolder, findMedia } from './store'

export async function saveMedia(options: {
  userId: string
  bytes: Buffer
  mime: string
  source: string
  prompt?: string | null
  extension?: string
  name?: string
  folderId?: string | null
}) {
  const folderId = options.folderId === undefined
    ? await ensureFolder(options.userId, folderName(options.source))
    : options.folderId
  const extension = options.extension || extnameFromMime(options.mime)
  const filename = safeName(options.name, extension)
  const form = new FormData()
  form.set('user', options.userId)
  if (folderId) form.set('folder', folderId)
  form.set('name', filename)
  form.set('kind', kindFromMime(options.mime))
  form.set('source', options.source)
  form.set('mime', options.mime)
  form.set('size', String(options.bytes.length))
  if (options.prompt) form.set('prompt', options.prompt)
  form.set('file', new File([new Uint8Array(options.bytes)], filename, { type: options.mime }))
  const record = await createRecord('library_files', form)
  return record.id
}

export async function getOwnedMedia(userId: string, assetId: string) {
  const asset = await findMedia(assetId)
  if (!asset || asset.userId !== userId) return null
  return asset
}

export async function readMediaBytes(assetId: string) {
  const opened = await fetchMedia(assetId)
  if (!opened) return null
  return Buffer.from(await new Response(opened.body).arrayBuffer())
}

export async function fetchMedia(assetId: string, thumb?: string) {
  const pb = await useAdminPb()
  let record
  try {
    record = await pb.collection('library_files').getOne(assetId, { requestKey: null })
  }
  catch (error) {
    if (isMissing(error)) return null
    throw error
  }
  const filename = typeof record.file === 'string' ? record.file : ''
  if (!filename) return null
  const token = await pb.files.getToken()
  const url = pb.files.getURL(record, filename, thumb ? { token, thumb } : { token })
  const response = await fetch(url)
  if (!response.ok || !response.body) return null
  const media = mapMedia(record)
  return {
    media,
    contentType: response.headers.get('content-type') || media.mime,
    body: response.body,
  }
}

export function folderName(source: string) {
  if (source === 'brand' || source === 'brain') return 'Brain'
  if (source === 'generated') return 'Gegenereerd'
  if (source === 'edited') return 'Bewerkingen'
  return 'Uploads'
}

export function kindFromMime(mime: string) {
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  return 'document'
}

function extnameFromMime(mime: string) {
  if (mime === 'image/png') return '.png'
  if (mime === 'image/jpeg') return '.jpg'
  if (mime === 'image/webp') return '.webp'
  if (mime === 'image/gif') return '.gif'
  if (mime === 'video/mp4') return '.mp4'
  if (mime === 'video/quicktime') return '.mov'
  if (mime === 'video/webm') return '.webm'
  if (mime === 'application/pdf') return '.pdf'
  return extname(mime) || '.bin'
}

function safeName(name: string | undefined, extension: string) {
  const base = (name || `bestand${extension}`).replace(/[^\w.\- ]+/g, '').trim().slice(0, 180)
  if (!base) return `bestand${extension}`
  if (base.includes('.')) return base
  return `${base}${extension}`
}
