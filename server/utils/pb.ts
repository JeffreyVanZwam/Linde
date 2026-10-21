import PocketBase, { type RecordModel } from 'pocketbase'

export type PbRecord = RecordModel

let admin: PocketBase | undefined
let adminAuth: Promise<void> | undefined

function runtimePocketbase() {
  const config = useRuntimeConfig()
  return {
    url: config.pocketbaseUrl || 'http://127.0.0.1:8090',
    email: config.pocketbaseAdminEmail || 'admin@linde.local',
    password: config.pocketbaseAdminPassword || 'linde-local-admin',
  }
}

export function pocketbaseUrl() {
  return runtimePocketbase().url
}

export function createPb() {
  const pb = new PocketBase(pocketbaseUrl())
  pb.autoCancellation(false)
  return pb
}

export async function useAdminPb() {
  if (!admin) admin = createPb()
  if (!admin.authStore.isValid) {
    if (!adminAuth) {
      const { email, password } = runtimePocketbase()
      adminAuth = admin.collection('_superusers').authWithPassword(email, password).then(() => undefined).finally(() => {
        adminAuth = undefined
      })
    }
    await adminAuth
  }
  return admin
}

export function isMissing(error: unknown) {
  return typeof error === 'object' && error !== null && 'status' in error && (error as { status: number }).status === 404
}

export async function listRecords(collection: string, options?: { filter?: string, sort?: string }) {
  const pb = await useAdminPb()
  return pb.collection(collection).getFullList({
    filter: options?.filter,
    sort: options?.sort,
    requestKey: null,
  })
}

export async function firstRecord(collection: string, filter: string) {
  const pb = await useAdminPb()
  const page = await pb.collection(collection).getList(1, 1, { filter, requestKey: null })
  return page.items[0] || null
}

export async function oneRecord(collection: string, id: string) {
  const pb = await useAdminPb()
  try {
    return await pb.collection(collection).getOne(id, { requestKey: null })
  }
  catch (error) {
    if (isMissing(error)) return null
    throw error
  }
}

export async function createRecord(collection: string, data: FormData | Record<string, unknown>) {
  const pb = await useAdminPb()
  const record = await pb.collection(collection).create(data, { requestKey: null })
  return record
}

export async function updateRecord(collection: string, id: string, data: Record<string, unknown>) {
  const pb = await useAdminPb()
  await pb.collection(collection).update(id, data, { requestKey: null })
}

export async function removeRecord(collection: string, id: string) {
  const pb = await useAdminPb()
  await pb.collection(collection).delete(id, { requestKey: null })
}

export async function removeFiltered(collection: string, filter: string) {
  const rows = await listRecords(collection, { filter })
  for (const row of rows) await removeRecord(collection, row.id)
}

export async function filterOf(expression: string, params: Record<string, unknown> = {}) {
  const pb = await useAdminPb()
  return pb.filter(expression, params)
}
