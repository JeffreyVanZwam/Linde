import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
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
const app = spawn(process.execPath, [resolve(root, 'node_modules/nuxt/bin/nuxt.mjs'), mode], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
})

function shutdown() {
  app.kill('SIGTERM')
  pocketbase.kill('SIGTERM')
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
app.on('exit', code => stop(code ?? 0))
