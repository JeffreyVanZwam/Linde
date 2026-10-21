import { apiError } from './http'
import { useAdminPb } from './pb'

type S3Settings = {
  enabled?: boolean
  bucket?: string
  region?: string
  endpoint?: string
  accessKey?: string
  secret?: string
  forcePathStyle?: boolean
}

async function readSettings() {
  const pb = await useAdminPb()
  return await pb.settings.getAll() as { s3?: S3Settings }
}

export async function storageView() {
  const s3 = (await readSettings()).s3 || {}
  return {
    mode: s3.enabled ? 's3' as const : 'local' as const,
    s3: {
      bucket: s3.bucket || '',
      region: s3.region || '',
      endpoint: s3.endpoint || '',
      accessKey: s3.accessKey || '',
      forcePathStyle: s3.forcePathStyle === true,
      hasSecret: Boolean(s3.secret),
    },
  }
}

export async function saveStorage(input: {
  mode: 'local' | 's3'
  bucket?: string
  region?: string
  endpoint?: string
  accessKey?: string
  secret?: string
  forcePathStyle?: boolean
}) {
  const previous = (await readSettings()).s3 || {}
  const next = {
    enabled: input.mode === 's3',
    bucket: input.bucket ?? previous.bucket ?? '',
    region: input.region ?? previous.region ?? '',
    endpoint: input.endpoint ?? previous.endpoint ?? '',
    accessKey: input.accessKey ?? previous.accessKey ?? '',
    secret: input.secret || previous.secret || '',
    forcePathStyle: input.forcePathStyle ?? previous.forcePathStyle ?? false,
  }
  if (next.enabled && (!next.bucket || !next.region || !next.endpoint || !next.accessKey || !next.secret)) {
    apiError(400, 'Vul bucket, regio, endpoint, access key en secret in')
  }
  const pb = await useAdminPb()
  await pb.settings.update({ s3: next })
}

export async function testStorage() {
  const pb = await useAdminPb()
  await pb.settings.testS3('storage')
}
