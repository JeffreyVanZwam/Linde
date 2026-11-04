import { z } from 'zod'
import { requireUser } from '../../utils/auth'
import { apiError, parseInput } from '../../utils/http'
import { deleteBrandRow, listBrandRows, setActiveBrand } from '../../utils/store'

const schema = z.object({
  confirm: z.string(),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id') || ''
  const rows = await listBrandRows(user.id)
  const current = rows.find(row => row.id === id)
  if (!current) apiError(404, 'Merk niet gevonden')
  if (rows.length < 2) apiError(400, 'Het laatste merk kan niet worden verwijderd')
  const input = parseInput(schema, await readBody(event))
  const name = current.companyName || ''
  if (!name || input.confirm !== name) apiError(400, 'Typ de merknaam om te verwijderen')
  const next = rows.find(row => row.id !== id && !row.archived) || rows.find(row => row.id !== id)
  if (next) await setActiveBrand(user.id, next.id)
  await deleteBrandRow(id)
  return { ok: true }
})
