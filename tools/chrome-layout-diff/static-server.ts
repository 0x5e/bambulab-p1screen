import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fixtureDir } from './config'

const contentTypes: Record<string, string> = {
  '.css': 'text/css',
  '.gif': 'image/gif',
  '.html': 'text/html',
  '.ico': 'image/x-icon',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
}

const sendFile = (response: http.ServerResponse, filePath: string) => {
  const ext = path.extname(filePath)
  response.writeHead(200, { 'content-type': contentTypes[ext] ?? 'application/octet-stream' })
  fs.createReadStream(filePath).pipe(response)
}

const isInsideDir = (rootDir: string, filePath: string) => {
  const relativePath = path.relative(rootDir, filePath)
  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath))
}

const resolveInside = (rootDir: string, requestPath: string) => {
  const filePath = path.resolve(rootDir, requestPath)
  return isInsideDir(rootDir, filePath) ? filePath : null
}

type StaticRequestResult =
  | { filePath: string }
  | { statusCode: 403 | 404, body: string }

export const resolveStaticRequest = (rootDir: string, requestPath: string): StaticRequestResult => {
  const distDir = path.resolve(rootDir, 'dist/web')
  const fixturesDir = path.resolve(rootDir, fixtureDir)

  if (requestPath.startsWith('/__chrome-layout-diff-fixtures/')) {
    const fixturePath = resolveInside(fixturesDir, decodeURIComponent(requestPath.replace('/__chrome-layout-diff-fixtures/', '')))
    if (!fixturePath) return { statusCode: 403, body: 'Forbidden' }
    if (!fs.existsSync(fixturePath) || !fs.statSync(fixturePath).isFile()) {
      return { statusCode: 404, body: 'Not Found' }
    }
    return { filePath: fixturePath }
  }

  const normalizedPath = requestPath === '/' ? '/index.html' : requestPath
  const filePath = resolveInside(distDir, decodeURIComponent(normalizedPath.replace(/^\/+/, '')))
  if (!filePath) return { statusCode: 403, body: 'Forbidden' }
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return { filePath }
  }
  return { filePath: path.join(distDir, 'index.html') }
}

export const startStaticServer = async (rootDir: string, port = 0) => {
  const distDir = path.resolve(rootDir, 'dist/web')

  if (!fs.existsSync(path.join(distDir, 'index.html'))) {
    throw new Error(`Missing frontend build at ${distDir}. Run npm run build:web first.`)
  }

  const server = http.createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost')
    const result = resolveStaticRequest(rootDir, url.pathname)

    if ('statusCode' in result) {
      response.writeHead(result.statusCode)
      response.end(result.body)
      return
    }
    sendFile(response, result.filePath)
  })

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, '0.0.0.0', () => {
      server.off('error', reject)
      resolve()
    })
  })

  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('Failed to start layout test static server')
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve())
    }),
  }
}
