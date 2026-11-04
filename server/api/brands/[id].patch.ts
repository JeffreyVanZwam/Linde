import { z } from 'zod'
import { requireUser } from '../../utils/auth'
import { toBrandView } from '../../utils/brand'
import { apiError, parseInput } from '../../utils/http'
import { ensureActiveBrand, listBrandRows, setActiveBrand, updateBrandMeta } from '../../utils/store'

const schema = z.object({
  companyName: z.string().trim().min(1).max(300).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  archived: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id') || ''
  const rows = await listBrandRows(user.id)
  const current = rows.find(row => row.id === id)
  if (!current) apiError(404, 'Merk niet gevonden')
  const input = parseInput(schema, await readBody(event))
  if (input.archived === true && rows.filter(row => !row.archived).length < 2 && !current.archived) {
    apiError(400, 'Het laatste merk kan niet worden gearchiveerd')
  }
  await updateBrandMeta(id, input)
  if (input.archived) {
    const active = await ensureActiveBrand(user.id)
    if (active?.id === id) {
      const next = rows.find(row => row.id !== id && !row.archived)
      if (next) await setActiveBrand(user.id, next.id)
    }
  }
  const updated = (await listBrandRows(user.id)).find(row => row.id === id)
  if (!updated) apiError(404, 'Merk niet gevonden')
  return toBrandView(updated)
})
