import { createRecord, filterOf, listRecords, removeRecord } from './pb'

export type BrandNote = {
  id: string
  kind: string
  title: string
  body: string
}

export async function listNotes(userId: string, brandId: string): Promise<BrandNote[]> {
  const rows = await listRecords('brand_notes', {
    filter: await filterOf('user = {:user} && brand = {:brand}', { user: userId, brand: brandId }),
    sort: '-created',
  })
  return rows.map(row => ({
    id: row.id,
    kind: String(row.kind || 'note'),
    title: String(row.title || ''),
    body: String(row.body || ''),
  }))
}

export async function createNote(input: { userId: string, brandId: string, kind: string, title: string, body: string }) {
  const row = await createRecord('brand_notes', {
    user: input.userId,
    brand: input.brandId,
    kind: input.kind,
    title: input.title,
    body: input.body,
  })
  return row.id
}

export async function deleteNote(id: string, userId: string, brandId: string) {
  const rows = await listRecords('brand_notes', {
    filter: await filterOf('id = {:id} && user = {:user} && brand = {:brand}', { id, user: userId, brand: brandId }),
  })
  if (!rows[0]) return false
  await removeRecord('brand_notes', id)
  return true
}
