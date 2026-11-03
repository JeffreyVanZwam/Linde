import { spawnSync } from 'node:child_process'
import { createPrivateKey, createPublicKey, X509Certificate } from 'node:crypto'
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import http from 'node:http'
import https from 'node:https'
import net from 'node:net'
import { homedir } from 'node:os'
import { resolve } from 'node:path'

const passphrase = 'linde-local'
const certificateLifetimeDays = '825'

const caConfigText = `[req]
distinguished_name = dn
x509_extensions = v3_ca
prompt = no

[dn]
CN = Linde Local CA

[v3_ca]
basicConstraints = critical, CA:TRUE
keyUsage = critical, keyCertSign, cRLSign
subjectKeyIdentifier = hash
`

const serverConfigText = `[req]
distinguished_name = dn
req_extensions = v3_req
prompt = no

[dn]
CN = localhost

[v3_req]
basicConstraints = CA:FALSE
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = DNS:localhost, IP:127.0.0.1
`

export function ensureLocalCertificate(root) {
  const directory = resolve(root, '.certs')
  mkdirSync(directory, { recursive: true })
  if (process.platform === 'win32') return ensureWindowsCertificate(root, directory)
  return ensureOpenSslCertificate(directory)
}

function ensureWindowsCertificate(root, directory) {
  const script = resolve(root, 'scripts/local-cert.ps1')
  const executable = process.env.SystemRoot
    ? `${process.env.SystemRoot}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`
    : 'powershell.exe'
  const result = spawnSync(executable, ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script, '-Directory', directory], {
    encoding: 'utf8',
  })
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || result.error?.message || 'Het lokale https-certificaat kon niet worden gemaakt.')
  }
  console.log('Lokaal https-certificaat gecontroleerd.')
  return { pfx: readFileSync(resolve(directory, 'localhost.pfx')), passphrase }
}

function ensureOpenSslCertificate(directory) {
  const certPath = resolve(directory, 'localhost.crt')
  const keyPath = resolve(directory, 'localhost.key')
  const caPath = resolve(directory, 'ca.crt')
  const existing = certificateIsUsable(certPath, keyPath, caPath)
  if (!existing) createOpenSslCertificate(directory, resolveOpenssl())
  console.log(existing ? 'Lokaal https-certificaat gevonden.' : 'Lokaal https-certificaat aangemaakt.')
  if (process.platform === 'darwin') ensureDarwinTrust(caPath, certPath)
  else if (!existing && process.platform === 'linux') {
    console.warn(`Vertrouw ${caPath} in de browser of in het systeem als https://localhost een waarschuwing geeft.`)
  }
  return {
    key: readFileSync(keyPath),
    cert: readFileSync(certPath),
  }
}

function certificateIsUsable(certPath, keyPath, caPath) {
  if (!existsSync(certPath) || !existsSync(keyPath) || !existsSync(caPath)) return false
  try {
    const certificate = new X509Certificate(readFileSync(certPath))
    const expires = new Date(certificate.validTo)
    if (Number.isNaN(expires.getTime()) || expires.getTime() < Date.now() + 86_400_000) return false
    if (!certificate.subjectAltName?.includes('DNS:localhost')) return false
    const fromKey = createPublicKey(createPrivateKey(readFileSync(keyPath))).export({ type: 'spki', format: 'der' })
    const fromCert = certificate.publicKey.export({ type: 'spki', format: 'der' })
    return Buffer.compare(fromKey, fromCert) === 0
  }
  catch {
    return false
  }
}

function resolveOpenssl() {
  const candidates = ['openssl']
  if (process.platform === 'darwin') candidates.push('/usr/bin/openssl')
  for (const candidate of candidates) {
    const result = spawnSync(candidate, ['version'], { encoding: 'utf8' })
    if (result.status === 0) return candidate
  }
  throw new Error('openssl is niet gevonden, dus het lokale https-certificaat kan niet worden gemaakt.')
}

function createOpenSslCertificate(directory, openssl) {
  const caKey = resolve(directory, 'ca.key')
  const caCert = resolve(directory, 'ca.crt')
  const key = resolve(directory, 'localhost.key')
  const cert = resolve(directory, 'localhost.crt')
  const csr = resolve(directory, 'localhost.csr')
  const serial = resolve(directory, 'ca.srl')
  const caConfig = resolve(directory, 'ca.cnf')
  const serverConfig = resolve(directory, 'server.cnf')
  for (const file of [caKey, caCert, key, cert, csr, serial]) rmSync(file, { force: true })
  writeFileSync(caConfig, caConfigText)
  writeFileSync(serverConfig, serverConfigText)
  try {
    run(openssl, ['genrsa', '-out', caKey, '2048'])
    run(openssl, ['req', '-x509', '-new', '-key', caKey, '-sha256', '-days', certificateLifetimeDays, '-out', caCert, '-config', caConfig, '-extensions', 'v3_ca'])
    run(openssl, ['genrsa', '-out', key, '2048'])
    run(openssl, ['req', '-new', '-key', key, '-out', csr, '-config', serverConfig])
    run(openssl, ['x509', '-req', '-in', csr, '-CA', caCert, '-CAkey', caKey, '-CAcreateserial', '-out', cert, '-days', certificateLifetimeDays, '-sha256', '-extfile', serverConfig, '-extensions', 'v3_req'])
    chmodSync(caKey, 0o600)
    chmodSync(key, 0o600)
  }
  finally {
    for (const file of [csr, serial, caConfig, serverConfig]) rmSync(file, { force: true })
  }
}

function ensureDarwinTrust(caPath, certPath) {
  const verify = spawnSync('security', ['verify-cert', '-c', certPath, '-p', 'ssl'], { encoding: 'utf8' })
  if (verify.status === 0) return
  console.log('Lokaal https-certificaat wordt aan de sleutelhanger toegevoegd. macOS kan om toestemming vragen.')
  const keychain = loginKeychain()
  const add = spawnSync('security', ['add-trusted-cert', '-r', 'trustRoot', '-p', 'ssl', '-k', keychain, caPath], { encoding: 'utf8' })
  if (add.status === 0) {
    console.log('Lokaal https-certificaat toegevoegd aan de sleutelhanger.')
    return
  }
  const detail = (add.stderr || add.stdout || add.error?.message || '').trim()
  console.warn(`macOS vertrouwt het lokale https-certificaat nog niet.${detail ? ` ${detail}` : ''}\nVoer dit eenmalig uit:\n  sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain "${caPath}"`)
}

function loginKeychain() {
  const directory = resolve(homedir(), 'Library/Keychains')
  for (const name of ['login.keychain-db', 'login.keychain']) {
    const path = resolve(directory, name)
    if (existsSync(path)) return path
  }
  return resolve(directory, 'login.keychain-db')
}

function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' })
  if (result.error) throw new Error(result.error.message)
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || `${command} is mislukt.`).trim())
  }
}

export function startDualServer({ publicPort, internalPort, pocketbasePort, tls }) {
  const httpServer = http.createServer((req, res) => proxyRequest(req, res, false))
  const httpsServer = https.createServer(tls, (req, res) => proxyRequest(req, res, true))
  httpServer.on('upgrade', proxyUpgrade)
  httpsServer.on('upgrade', proxyUpgrade)
  httpServer.on('clientError', (_error, socket) => socket.destroy())
  httpsServer.on('tlsClientError', (_error, socket) => socket.destroy())

  const router = net.createServer((socket) => {
    socket.on('error', () => {})
    socket.once('data', (buffer) => {
      socket.pause()
      const secure = buffer[0] === 22
      socket.unshift(buffer)
      ;(secure ? httpsServer : httpServer).emit('connection', socket)
      process.nextTick(() => socket.resume())
    })
  })

  function route(raw) {
    const url = raw || '/'
    if (url === '/pb' || url.startsWith('/pb/') || url.startsWith('/pb?')) {
      return { host: '127.0.0.1', port: pocketbasePort, path: url.replace(/^\/pb/, '') || '/', hostHeader: `127.0.0.1:${pocketbasePort}` }
    }
    return { host: '127.0.0.1', port: internalPort, path: url, hostHeader: null }
  }

  function proxyRequest(req, res, secure) {
    const target = route(req.url)
    const headers = {
      ...req.headers,
      'x-forwarded-proto': secure ? 'https' : 'http',
      'x-forwarded-port': String(publicPort),
    }
    if (target.hostHeader) headers.host = target.hostHeader
    const upstream = http.request({
      hostname: target.host,
      port: target.port,
      method: req.method,
      path: target.path,
      headers,
    }, (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode || 502, upstreamRes.headers)
      upstreamRes.pipe(res)
    })
    upstream.on('error', () => {
      if (!res.headersSent) res.writeHead(502)
      res.end()
    })
    req.pipe(upstream)
  }

  function proxyUpgrade(req, socket, head) {
    const target = route(req.url)
    const headers = { ...req.headers }
    if (target.hostHeader) headers.host = target.hostHeader
    const upstream = http.request({
      hostname: target.host,
      port: target.port,
      method: 'GET',
      path: target.path,
      headers,
    })
    upstream.on('upgrade', (response, upstreamSocket, upstreamHead) => {
      const lines = [`HTTP/1.1 ${response.statusCode} ${response.statusMessage || ''}`.trim()]
      for (const [key, value] of Object.entries(response.headers)) {
        if (value == null) continue
        for (const item of Array.isArray(value) ? value : [value]) lines.push(`${key}: ${item}`)
      }
      socket.write(`${lines.join('\r\n')}\r\n\r\n`)
      if (upstreamHead?.length) socket.write(upstreamHead)
      if (head?.length) upstreamSocket.write(head)
      upstreamSocket.pipe(socket)
      socket.pipe(upstreamSocket)
      upstreamSocket.on('error', () => socket.destroy())
      socket.on('error', () => upstreamSocket.destroy())
    })
    upstream.on('error', () => socket.destroy())
    upstream.end()
  }

  return new Promise((resolvePromise, reject) => {
    router.once('error', reject)
    router.listen(publicPort, () => {
      console.log(`Linde: http://localhost:${publicPort} en https://localhost:${publicPort}`)
      resolvePromise(router)
    })
  })
}
