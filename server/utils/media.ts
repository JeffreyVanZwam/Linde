import { createReadStream } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'
import { eq } from 'drizzle-orm'
import { useDb } from '../db/client'
import { mediaAssets } from '../db/schema'
import { id } from './http'

const root = resolve('.data')

export function mediaPath(userId: string, filename: string) {
  return join('uploads', userId, filename)
}

export function absoluteMediaPath(relativePath: string) {
  const absolute = resolve(root, relativePath)
  if (!absolute.startsWith(root)) {
    throw createError({ statusCode: 400, statusMessage: 'Ongeldig bestandspad' })
  }
  return absolute
}

export async function saveMedia(options: {
  userId: string
  bytes: Buffer
  mime: string
  source: string
  prompt?: string | null
  extension?: string
}) {
  const kind = options.mime.startsWith('video/') ? 'video' : 'image'
  const extension = options.extension || extnameFromMime(options.mime)
  const assetId = id()
  const relative = mediaPath(options.userId, `${assetId}${extension}`)
  const absolute = absoluteMediaPath(relative)
  await mkdir(join(absolute, '..'), { recursive: true })
  await writeFile(absolute, options.bytes)
  const now = new Date()
  await useDb().insert(mediaAssets).values({
    id: assetId,
    userId: options.userId,
    kind,
    source: options.source,
    path: relative.replaceAll('\\', '/'),
    mime: options.mime,
    prompt: options.prompt || null,
    createdAt: now,
  })
  return assetId
}

export async function getOwnedMedia(userId: string, assetId: string) {
  const asset = await useDb().query.mediaAssets.findFirst({ where: eq(mediaAssets.id, assetId) })
  if (!asset || asset.userId !== userId) return null
  return asset
}

export function streamMedia(relativePath: string) {
  return createReadStream(absoluteMediaPath(relativePath))
}

function extnameFromMime(mime: string) {
  if (mime === 'image/png') return '.png'
  if (mime === 'image/jpeg') return '.jpg'
  if (mime === 'image/webp') return '.webp'
  if (mime === 'image/gif') return '.gif'
  if (mime === 'video/mp4') return '.mp4'
  if (mime === 'video/quicktime') return '.mov'
  if (mime === 'video/webm') return '.webm'
  return extname(mime) || '.bin'
}
