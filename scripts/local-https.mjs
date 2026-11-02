import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import http from 'node:http'
import https from 'node:https'
import net from 'node:net'
import { resolve } from 'node:path'

const passphrase = 'linde-local'

export function ensureLocalCertificate(root) {
  const directory = resolve(root, '.certs')
  const script = resolve(root, 'scripts/local-cert.ps1')
  const executable = process.env.SystemRoot
    ? `${process.env.SystemRoot}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`
    : 'powershell.exe'
  const result = spawnSync(executable, ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script, '-Directory', directory], {
    encoding: 'utf8',
  })
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'Het lokale https-certificaat kon niet worden gemaakt.')
  }
  return { pfx: readFileSync(resolve(directory, 'localhost.pfx')), passphrase }
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
