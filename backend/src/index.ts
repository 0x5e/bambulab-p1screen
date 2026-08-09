import http from 'node:http'
import path from 'node:path'
import tls from 'node:tls'
import { Readable } from 'node:stream'
import express from 'express'
import { WebSocketServer } from 'ws'

const WEB_PORT = Number(process.env.PORT ?? '8889')
const WEB_ROOT = path.resolve(process.cwd(), 'dist/web')
const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'content-encoding',
  'content-length',
  'expect',
  'host',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'x-powered-by',
])
const DEFAULT_PROXY_HEADERS = {
  'User-Agent': 'bambu_network_agent/01.09.05.01',
  'Accept-Encoding': 'gzip, deflate',
}
const FORCED_PROXY_HEADERS = new Set(Object.keys(DEFAULT_PROXY_HEADERS).map(name => name.toLowerCase()))

const app = express()
app.disable('x-powered-by')

const buildProxyTargetUrl = (req: express.Request) => {
  const rawPath = req.originalUrl.split('?')[0] ?? ''
  const encodedTarget = rawPath.slice('/api/https'.length).replace(/^\/+/, '')
  if (!encodedTarget) {
    throw new Error('Missing target host')
  }

  const [targetHost, ...targetPathParts] = encodedTarget.split('/')
  if (!targetHost) {
    throw new Error('Missing target host')
  }

  const targetPath = targetPathParts.length > 0 ? `/${targetPathParts.join('/')}` : '/'
  const target = new URL(`https://${targetHost}${targetPath}`)

  const queryIndex = req.originalUrl.indexOf('?')
  if (queryIndex >= 0) {
    target.search = req.originalUrl.slice(queryIndex)
  }
  return target
}

const buildProxyHeaders = (req: express.Request) => {
  const headers = new Headers()
  for (const [name, value] of Object.entries(DEFAULT_PROXY_HEADERS)) {
    headers.set(name, value)
  }
  for (const [name, value] of Object.entries(req.headers)) {
    const lowerName = name.toLowerCase()
    if (HOP_BY_HOP_HEADERS.has(lowerName) || FORCED_PROXY_HEADERS.has(lowerName)) {
      continue
    }
    if (Array.isArray(value)) {
      value.forEach(item => headers.append(name, item))
    } else if (value !== undefined) {
      headers.set(name, value)
    }
  }
  return headers
}

const handleHttpProxy: express.RequestHandler = async (req, res) => {
  let target: URL
  try {
    target = buildProxyTargetUrl(req)
  } catch (err: any) {
    res.status(400).send(err.message)
    return
  }

  const method = req.method.toUpperCase()
  const hasBody = method !== 'GET' && method !== 'HEAD'
  try {
    const response = await fetch(target, {
      method,
      headers: buildProxyHeaders(req),
      body: hasBody ? req : undefined,
      duplex: hasBody ? 'half' : undefined,
      redirect: 'manual',
    } as RequestInit & { duplex?: 'half' })

    res.status(response.status)
    response.headers.forEach((value, name) => {
      if (!HOP_BY_HOP_HEADERS.has(name.toLowerCase())) {
        res.append(name, value)
      }
    })

    if (response.body) {
      Readable.fromWeb(response.body as any).pipe(res)
    } else {
      res.end()
    }
  } catch (err) {
    console.error('[server] http proxy error:', err)
    res.status(502).send('Bad Gateway')
  }
}

app.all('/api/https/*', handleHttpProxy)

app.use('/', express.static(WEB_ROOT))

const server = http.createServer(app)
const tlsProxy = new WebSocketServer({ server, path: '/tls' })

tlsProxy.on('connection', (socket, req) => {
  const remote = req.socket.remoteAddress + ':' + req.socket.remotePort
  const reqUrl = new URL(req.url ?? '', `http://${req.headers.host ?? 'localhost'}`)
  const encodedTargetUrl = reqUrl.searchParams.get('url')

  if (!encodedTargetUrl) {
    console.error(`[tls-proxy][${remote}] missing url query`)
    socket.close()
    return
  }

  let targetUrl: URL
  try {
    targetUrl = new URL(encodedTargetUrl)
  } catch {
    console.error(`[tls-proxy][${remote}] invalid url: ${encodedTargetUrl}`)
    socket.close()
    return
  }

  if (!['mqtts:', 'tls:'].includes(targetUrl.protocol)) {
    console.error(`[tls-proxy][${remote}] unsupported protocol: ${targetUrl.protocol}`)
    socket.close()
    return
  }

  const targetHost = targetUrl.hostname
  const targetPort = Number(targetUrl.port)
  if (!targetHost || Number.isNaN(targetPort) || targetPort <= 0 || targetPort > 65535) {
    console.error(`[tls-proxy][${remote}] invalid target: ${targetUrl.toString()}`)
    socket.close()
    return
  }

  console.info(`[tls-proxy][${remote}] connecting to ${targetHost}:${targetPort}`)
  const tlsSocket = tls.connect({
    host: targetHost,
    port: targetPort,
    rejectUnauthorized: false,
  })

  let closed = false
  const closeBoth = (reason: string) => {
    if (closed) {
      return
    }
    closed = true
    console.info(`[tls-proxy][${remote}] closing bridge: ${reason}`)
    if (socket.readyState === socket.OPEN || socket.readyState === socket.CLOSING) {
      socket.close()
    }
    if (!tlsSocket.destroyed) {
      tlsSocket.destroy()
    }
  }

  tlsSocket.on('secureConnect', () => {
    console.info(`[tls-proxy][${remote}] tls connected to ${targetHost}:${targetPort}`)
  })

  tlsSocket.on('data', (chunk) => {
    if (socket.readyState !== socket.OPEN) {
      closeBoth('ws not open on tls->ws data')
      return
    }
    socket.send(chunk, { binary: true }, (err) => {
      if (err) {
        console.error(`[tls-proxy][${remote}] ws send failed: ${err.message}`)
        closeBoth('ws send failure')
      }
    })
  })

  tlsSocket.on('end', () => {
    closeBoth('tls end')
  })

  tlsSocket.on('close', () => {
    closeBoth('tls close')
  })

  tlsSocket.on('error', (err) => {
    console.error(`[tls-proxy][${remote}] tls error: ${err.message}`)
    closeBoth('tls error')
  })

  socket.on('message', (raw: Buffer) => {
    if (tlsSocket.destroyed) {
      closeBoth('tls already destroyed on ws->tls data')
      return
    }
    const chunk = new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength)
    tlsSocket.write(chunk, (err) => {
      if (err) {
        console.error(`[tls-proxy][${remote}] tls write failed: ${err.message}`)
        closeBoth('tls write failure')
      }
    })
  })

  socket.on('close', () => {
    closeBoth('ws close')
  })

  socket.on('error', (err) => {
    console.error(`[tls-proxy][${remote}] ws error: ${err.message}`)
    closeBoth('ws error')
  })
})

const start = async () => {
  server.listen(WEB_PORT, () => {
    console.log(`[server] listening on ${WEB_PORT}`)
    if (process.env.NODE_ENV === 'production') {
      console.log(`[server] WEB_ROOT=${WEB_ROOT}`)
    }
  })
}

start().catch((err) => {
  console.error('[server] failed to start', err)
  process.exit(1)
})
