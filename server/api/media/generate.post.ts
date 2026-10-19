import { generateImage } from 'ai'
import { z } from 'zod'
import { requireUser } from '../../utils/auth'
import { getImageModel } from '../../utils/ai'
import { parseInput } from '../../utils/http'
import { saveMedia } from '../../utils/media'

const schema = z.object({
  prompt: z.string().min(3).max(2000),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const input = parseInput(schema, await readBody(event))
  const result = await generateImage({
    model: getImageModel(),
    prompt: input.prompt,
    size: '1024x1024',
  })
  const assetId = await saveMedia({
    userId: user.id,
    bytes: Buffer.from(result.image.uint8Array),
    mime: result.image.mediaType || 'image/png',
    source: 'generated',
    prompt: input.prompt,
  })
  return { id: assetId }
})
