import { apiError } from './http'
import { useAdminPb, type PbRecord } from './pb'

export type ManagedUser = {
  id: string
  name: string
  email: string
  role: 'admin' | 'member'
  created: string
}

function mapUser(record: PbRecord): ManagedUser {
  return {
    id: record.id,
    name: typeof record.name === 'string' && record.name ? record.name : String(record.email || ''),
    email: String(record.email || ''),
    role: record.role === 'admin' ? 'admin' : 'member',
    created: String(record.created || ''),
  }
}

export async function listManagedUsers() {
  const pb = await useAdminPb()
  const records = await pb.collection('users').getFullList({ sort: 'created', requestKey: null })
  return records.map(mapUser)
}

export async function countOtherAdmins(userId: string) {
  const users = await listManagedUsers()
  return users.filter(user => user.role === 'admin' && user.id !== userId).length
}

export async function createManagedUser(input: { name: string, email: string, password: string, role: 'admin' | 'member' }) {
  const pb = await useAdminPb()
  try {
    const record = await pb.collection('users').create({
      email: input.email,
      emailVisibility: false,
      password: input.password,
      passwordConfirm: input.password,
      verified: true,
      name: input.name,
      role: input.role,
    }, { requestKey: null })
    return mapUser(record)
  }
  catch {
    apiError(400, 'Gebruiker aanmaken mislukte. Controleer e-mail en wachtwoord.')
  }
}

export async function updateManagedUser(id: string, patch: { name?: string, role?: 'admin' | 'member' }) {
  const users = await listManagedUsers()
  const current = users.find(user => user.id === id)
  if (!current) apiError(404, 'Gebruiker niet gevonden')
  if (patch.role && patch.role !== 'admin' && current.role === 'admin' && await countOtherAdmins(id) === 0) {
    apiError(400, 'Er moet minstens één beheerder blijven')
  }
  const pb = await useAdminPb()
  const data: Record<string, unknown> = {}
  if (patch.name) data.name = patch.name
  if (patch.role) data.role = patch.role
  const record = await pb.collection('users').update(id, data, { requestKey: null })
  return mapUser(record)
}

export async function deleteManagedUser(id: string, actorId: string) {
  if (id === actorId) apiError(400, 'Je kunt jezelf niet verwijderen')
  const users = await listManagedUsers()
  const current = users.find(user => user.id === id)
  if (!current) apiError(404, 'Gebruiker niet gevonden')
  if (current.role === 'admin' && await countOtherAdmins(id) === 0) {
    apiError(400, 'Er moet minstens één beheerder blijven')
  }
  const pb = await useAdminPb()
  await pb.collection('users').delete(id, { requestKey: null })
}
