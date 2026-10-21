import { spawn, spawnSync } from 'node:child_process'
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'

const version = '0.40.5'
const root = resolve(import.meta.dirname, '..')
const binDir = resolve(root, '.data/bin')
const dataDir = resolve(root, '.data/pb')
const migrationsDir = resolve(root, 'pocketbase/pb_migrations')

export function loadEnv() {
  const path = resolve(root, '.env')
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = value
  }
}

export function pocketbaseDefaults() {
  process.env.POCKETBASE_URL ||= 'http://127.0.0.1:8090'
  process.env.POCKETBASE_ADMIN_EMAIL ||= 'admin@linde.local'
  process.env.POCKETBASE_ADMIN_PASSWORD ||= 'linde-local-admin'
}

function assetName() {
  const arch = process.arch === 'arm64' ? 'arm64' : 'amd64'
  if (process.platform === 'darwin') return `pocketbase_${version}_darwin_${arch}.zip`
  if (process.platform === 'linux') return `pocketbase_${version}_linux_${arch}.zip`
  if (process.platform === 'win32') return `pocketbase_${version}_windows_amd64.zip`
  throw new Error(`Geen PocketBase-build voor ${process.platform} ${process.arch}`)
}

function binaryPath() {
  return resolve(binDir, process.platform === 'win32' ? 'pocketbase.exe' : 'pocketbase')
}

export async function ensureBinary() {
  const binary = binaryPath()
  if (existsSync(binary)) return binary
  mkdirSync(binDir, { recursive: true })
  const name = assetName()
  const url = `https://github.com/pocketbase/pocketbase/releases/download/v${version}/${name}`
  console.log(`PocketBase ${version} downloaden…`)
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Download mislukte (${response.status}) voor ${url}`)
  const zipPath = resolve(tmpdir(), name)
  writeFileSync(zipPath, Buffer.from(await response.arrayBuffer()))
  const extract = process.platform === 'win32'
    ? spawnSync('tar', ['-xf', zipPath, '-C', binDir], { stdio: 'inherit' })
    : spawnSync('unzip', ['-o', zipPath, '-d', binDir], { stdio: 'inherit' })
  if (extract.status !== 0 || !existsSync(binary)) {
    throw new Error('PocketBase-binary ontbreekt na het uitpakken')
  }
  if (process.platform !== 'win32') chmodSync(binary, 0o755)
  return binary
}

export function upsertSuperuser(binary) {
  const result = spawnSync(binary, [
    'superuser',
    'upsert',
    process.env.POCKETBASE_ADMIN_EMAIL,
    process.env.POCKETBASE_ADMIN_PASSWORD,
    `--dir=${dataDir}`,
  ], {
    cwd: root,
    stdio: 'inherit',
  })
  if (result.status !== 0) throw new Error('PocketBase-superuser aanmaken mislukte')
}

export function startPocketbase(binary) {
  mkdirSync(dataDir, { recursive: true })
  const url = new URL(process.env.POCKETBASE_URL || 'http://127.0.0.1:8090')
  return spawn(binary, [
    'serve',
    `--dir=${dataDir}`,
    `--migrationsDir=${migrationsDir}`,
    `--http=${url.host}`,
    '--automigrate=false',
  ], {
    cwd: root,
    stdio: 'inherit',
  })
}

export async function waitForPocketbase() {
  const url = `${process.env.POCKETBASE_URL}/api/health`
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    }
    catch {
      // PocketBase start nog.
    }
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  throw new Error(`PocketBase werd niet bereikbaar op ${url}`)
}

const invoked = process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)
if (invoked) {
  loadEnv()
  pocketbaseDefaults()
  const binary = await ensureBinary()
  upsertSuperuser(binary)
  const child = startPocketbase(binary)
  child.on('exit', code => process.exit(code ?? 0))
}
