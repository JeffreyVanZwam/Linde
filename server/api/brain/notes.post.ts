import { z } from 'zod'
import { textFromBytes } from '../../utils/files/text'
import { parseInput } from '../../utils/http'
import { createNote } from '../../utils/knowledge'
import { readMediaBytes } from '../../utils/media'
import { requireBrand } from '../../utils/scope'
import { findMedia } from '../../utils/store'

const schema = z.object({
  kind: z.enum(['note', 'voice', 'document']),
  title: z.string().trim().max(300).default(''),
  body: z.string().max(20000).default(''),
  fileId: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const { user, brand } = await requireBrand(event)
  const input = parseInput(schema, await readBody(event))
  let body = input.body
  if (input.fileId) {
    const media = await findMedia(input.fileId)
    if (!media || media.userId !== user.id || media.brandId !== brand.id) {
      throw createError({ statusCode: 404, statusMessage: 'Bestand niet gevonden' })
    }
    const bytes = await readMediaBytes(media.id)
    const extracted = bytes ? textFromBytes(bytes, media.mime, media.name) : ''
    body = [body, extracted].filter(Boolean).join('\n\n').slice(0, 20000)
  }
  if (!body.trim()) throw createError({ statusCode: 400, statusMessage: 'Geen tekst in deze notitie' })
  const id = await createNote({
    userId: user.id,
    brandId: brand.id,
    kind: input.kind,
    title: input.title || (input.kind === 'voice' ? 'Schrijfvoorbeeld' : 'Notitie'),
    body,
  })
  return { id }
})
