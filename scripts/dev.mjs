import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { ensureLocalCertificate, startDualServer } from './local-https.mjs'
import {
  ensureBinary,
  loadEnv,
  pocketbaseDefaults,
  startPocketbase,
  upsertSuperuser,
  waitForPocketbase,
} from './pocketbase.mjs'

loadEnv()
pocketbaseDefaults()

const mode = process.argv[2] === 'preview' ? 'preview' : 'dev'
const binary = await ensureBinary()
upsertSuperuser(binary)
const pocketbase = startPocketbase(binary)

let stopped = false
function stop(code = 0) {
  if (stopped) return
  stopped = true
  pocketbase.kill('SIGTERM')
  process.exit(code)
}

pocketbase.on('exit', (code) => {
  if (!stopped) {
    console.error('PocketBase is gestopt.')
    process.exit(code ?? 1)
  }
})

try {
  await waitForPocketbase()
}
catch (error) {
  console.error(error instanceof Error ? error.message : error)
  stop(1)
}

const root = resolve(import.meta.dirname, '..')
const publicPort = 3000
const internalPort = 3010
let endpoints
try {
  const tls = ensureLocalCertificate(root)
  endpoints = await startDualServer({ publicPort, internalPort, pocketbasePort: 8090, tls })
}
catch (error) {
  console.error(error instanceof Error ? error.message : error)
  stop(1)
}
const app = spawn(process.execPath, [resolve(root, 'node_modules/nuxt/bin/nuxt.mjs'), mode, '--host', '127.0.0.1', '--port', String(internalPort)], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, HOST: '127.0.0.1', PORT: String(internalPort), LINDE_PUBLIC_PORT: String(publicPort) },
})

function shutdown() {
  endpoints.close()
  app.kill('SIGTERM')
  pocketbase.kill('SIGTERM')
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
app.on('exit', code => stop(code ?? 0))
