export type FTPFileInfo = {
  name: string
  size: number
  isDirectory: boolean
  rawModifiedAt?: string
}

type FTPResponse = {
  code: number
  message: string
}

type PendingResponse = {
  resolve: (response: FTPResponse) => void
  reject: (error: Error) => void
}

export class FtpError extends Error {
  code: number

  constructor(response: FTPResponse) {
    super(response.message)
    this.name = 'FtpError'
    this.code = response.code
  }
}

/**
 * Parses the passive data port from an EPSV response.
 * e.g. "229 Entering Extended Passive Mode (|||6446|)"
 */
const parseEpsvPort = (message: string): number | undefined => {
  const groups = message.match(/[|!]{3}(.+)[|!]/)
  if (!groups?.[1]) return undefined
  const port = parseInt(groups[1], 10)
  return Number.isNaN(port) ? undefined : port
}

/**
 * Parses the passive data port from a PASV response.
 * e.g. "227 Entering Passive Mode (192,168,1,100,10,229)"
 */
const parsePasvPort = (message: string): number | undefined => {
  const groups = message.match(/([-\d]+,[-\d]+,[-\d]+,[-\d]+),([-\d]+),([-\d]+)/)
  if (!groups || groups.length !== 4) return undefined
  return (parseInt(groups[2], 10) & 255) * 256 + (parseInt(groups[3], 10) & 255)
}

/**
 * Parses a UNIX-style LIST response into file entries.
 * e.g. "-rw-r--r--    1 1000 1000 1048576 Aug 09 10:00 test.3mf"
 */
const parseList = (text: string): FTPFileInfo[] => {
  const files: FTPFileInfo[] = []
  for (const rawLine of text.split('\n')) {
    const line = rawLine.replace(/\r$/, '')
    if (!line.trim()) continue
    const match = /^([dl-])[rwxstST-]{9}\s+\d+\s+\S+\s+\S+\s+(\d+)\s+(.+?)\s+([^ ]+)$/.exec(line)
    if (!match) continue
    files.push({
      name: match[4],
      size: parseInt(match[2], 10),
      isDirectory: match[1] === 'd',
      rawModifiedAt: match[3],
    })
  }
  return files
}

/**
 * Lightweight FTPS client that runs entirely in the browser.
 *
 * It speaks the FTP protocol over a WebSocket byte tunnel (e.g. the backend
 * `/tls?url=tls://host:990` proxy) and requires no Node built-ins. The tunnel
 * terminates TLS, so the WebSocket carries plaintext FTP bytes.
 *
 * Supports the operations needed for local printing: connect, login, passive
 * mode (EPSV with PASV fallback), directory listing and file download.
 */
export class FTPSClient {
  private ws: WebSocket | null = null
  private controlUrl = ''
  private buffer = ''
  private pending: PendingResponse | null = null
  private responseTimer: ReturnType<typeof setTimeout> | null = null
  private closed = true

  constructor(private timeout = 30000) {}

  /**
   * Opens the control channel through the given WebSocket tunnel and waits for
   * the FTP greeting.
   * @param url WebSocket channel URL, e.g.
   *   `wss://host/tls?url=tls%3A%2F%2F192.168.1.23%3A990`.
   */
  async connect(url: string): Promise<void> {
    if (!url) throw new Error('[FTPSClient] missing WebSocket URL')
    this.close()

    this.controlUrl = url
    this.buffer = ''
    this.closed = false

    const ws = new WebSocket(url)
    ws.binaryType = 'arraybuffer'
    this.ws = ws

    ws.addEventListener('message', (event) => {
      this.buffer += new TextDecoder().decode(event.data as ArrayBuffer)
      this.processBuffer()
    })
    ws.addEventListener('close', () => {
      this.ws = null
      this.rejectPending(new Error('[FTPSClient] FTP channel closed'))
    })
    ws.addEventListener('error', () => {
      this.rejectPending(new Error('[FTPSClient] FTP channel error'))
    })

    await new Promise<void>((resolve, reject) => {
      const onError = () => {
        ws.removeEventListener('open', onOpen)
        reject(new Error(`[FTPSClient] failed to open channel: ${url}`))
      }
      const onOpen = () => {
        ws.removeEventListener('error', onError)
        this.waitForResponse().then(greeting => {
          if (greeting.code >= 400) {
            reject(new FtpError(greeting))
          } else {
            resolve()
          }
        }, reject)
      }
      ws.addEventListener('open', onOpen)
      ws.addEventListener('error', onError)
    })
  }

  /**
   * Logs in with a username and password.
   * @returns No return value.
   */
  async login(user = 'anonymous', password = 'guest'): Promise<void> {
    const res = await this.sendCommand(`USER ${user}`)
    if (res.code === 331) {
      const pass = await this.sendCommand(`PASS ${password}`)
      if (pass.code >= 400) throw new FtpError(pass)
    } else if (res.code >= 400) {
      throw new FtpError(res)
    }
  }

  /**
   * Lists files in the given remote directory.
   * @param path Remote directory path, default is the current directory.
   * @returns Parsed file entries.
   */
  async list(path = ''): Promise<FTPFileInfo[]> {
    const data = await this.openPassiveChannel()
    try {
      const res = await this.sendCommand(path ? `LIST ${path}` : 'LIST')
      if (res.code >= 400) throw new FtpError(res)
      const text = await this.collectText(data)
      const complete = await this.waitForResponse()
      if (complete.code >= 400) throw new FtpError(complete)
      return parseList(text)
    } finally {
      data.close()
    }
  }

  /**
   * Downloads a remote file and returns its content.
   * @param remotePath Path of the remote file to read.
   * @returns The file content as a byte array.
   */
  async downloadContent(remotePath: string): Promise<Uint8Array> {
    const data = await this.openPassiveChannel()
    try {
      const res = await this.sendCommand(`RETR ${remotePath}`)
      if (res.code >= 400) throw new FtpError(res)
      const bytes = await this.collectBytes(data)
      const complete = await this.waitForResponse()
      if (complete.code >= 400) throw new FtpError(complete)
      return bytes
    } finally {
      data.close()
    }
  }

  /**
   * Closes the FTP connection.
   * @returns No return value.
   */
  close() {
    if (this.closed) return
    this.closed = true
    this.clearResponseTimer()
    this.rejectPending(new Error('[FTPSClient] client closed'))
    try {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(new TextEncoder().encode('QUIT\r\n'))
      }
    } catch {
      // ignore
    }
    try {
      this.ws?.close()
    } catch {
      // ignore
    }
    this.ws = null
  }

  private sendCommand(command: string): Promise<FTPResponse> {
    if (!this.ws || this.closed) throw new Error('[FTPSClient] not connected')
    const response = this.waitForResponse()
    this.ws.send(new TextEncoder().encode(`${command}\r\n`))
    return response
  }

  private waitForResponse(): Promise<FTPResponse> {
    if (this.pending) throw new Error('[FTPSClient] command already in flight')
    this.clearResponseTimer()
    return new Promise((resolve, reject) => {
      this.pending = { resolve, reject }
      this.responseTimer = setTimeout(() => {
        this.rejectPending(new Error(`[FTPSClient] response timeout after ${this.timeout}ms`))
      }, this.timeout)
      // The response might already be buffered (e.g. greeting or 226 after data).
      this.processBuffer()
    })
  }

  private processBuffer() {
    while (this.pending) {
      const idx = this.buffer.indexOf('\r\n')
      if (idx < 0) return
      const line = this.buffer.slice(0, idx)
      const match = /^(\d{3})([ -])/.exec(line)
      if (!match) {
        this.rejectPending(new Error(`[FTPSClient] invalid FTP response: ${line}`))
        this.buffer = ''
        return
      }

      const code = parseInt(match[1], 10)
      if (match[2] === ' ') {
        // Single-line response.
        const message = this.buffer.slice(0, idx)
        this.buffer = this.buffer.slice(idx + 2)
        this.resolvePending({ code, message })
        continue
      }

      // Multiline response: "NNN-first\r\n...\r\nNNN last\r\n".
      const terminator = `${code} `
      const lines = this.buffer.split('\r\n')
      let endIdx = -1
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].startsWith(terminator)) {
          endIdx = i
          break
        }
      }
      if (endIdx < 0) return // wait for more data
      const consumed = lines.slice(0, endIdx + 1).join('\r\n') + '\r\n'
      this.buffer = this.buffer.slice(consumed.length)
      this.resolvePending({ code, message: consumed.replace(/\r\n$/, '') })
    }
  }

  private resolvePending(response: FTPResponse) {
    const pending = this.pending
    this.pending = null
    this.clearResponseTimer()
    pending?.resolve(response)
  }

  private rejectPending(error: Error) {
    const pending = this.pending
    this.pending = null
    this.clearResponseTimer()
    pending?.reject(error)
  }

  private clearResponseTimer() {
    if (this.responseTimer) {
      clearTimeout(this.responseTimer)
      this.responseTimer = null
    }
  }

  /**
   * Enters passive mode and opens a WebSocket data channel to the announced
   * port, mirroring the control channel's tunnel target.
   */
  private async openPassiveChannel(): Promise<WebSocket> {
    let port: number | undefined
    try {
      const res = await this.sendCommand('EPSV')
      port = parseEpsvPort(res.message)
      if (port === undefined) {
        throw new Error(`[FTPSClient] can't parse EPSV response: ${res.message}`)
      }
    } catch {
      const res = await this.sendCommand('PASV')
      port = parsePasvPort(res.message)
      if (port === undefined) {
        throw new Error(`[FTPSClient] can't parse PASV response: ${res.message}`)
      }
    }

    return this.openDataChannel(this.buildDataChannelUrl(port))
  }

  private buildDataChannelUrl(port: number): string {
    const parsed = new URL(this.controlUrl)
    const target = parsed.searchParams.get('url')
    const host = target ? new URL(target).hostname : parsed.hostname
    const next = new URL(parsed.toString())
    next.searchParams.set('url', `tls://${host}:${port}`)
    return next.toString()
  }

  private openDataChannel(url: string): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url)
      ws.binaryType = 'arraybuffer'
      const onError = () => {
        ws.removeEventListener('open', onOpen)
        reject(new Error(`[FTPSClient] failed to open data channel: ${url}`))
      }
      const onOpen = () => {
        ws.removeEventListener('error', onError)
        resolve(ws)
      }
      ws.addEventListener('open', onOpen)
      ws.addEventListener('error', onError)
    })
  }

  private collectBytes(data: WebSocket): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      const chunks: Uint8Array[] = []
      const timer = setTimeout(() => {
        cleanup()
        reject(new Error(`[FTPSClient] data channel timeout after ${this.timeout}ms`))
      }, this.timeout)
      const cleanup = () => clearTimeout(timer)
      data.addEventListener('message', (event) => {
        chunks.push(new Uint8Array(event.data as ArrayBuffer))
      })
      data.addEventListener('close', () => {
        cleanup()
        const total = chunks.reduce((n, chunk) => n + chunk.length, 0)
        const bytes = new Uint8Array(total)
        let offset = 0
        for (const chunk of chunks) {
          bytes.set(chunk, offset)
          offset += chunk.length
        }
        resolve(bytes)
      })
      data.addEventListener('error', () => {
        cleanup()
        reject(new Error('[FTPSClient] data channel error'))
      })
    })
  }

  private collectText(data: WebSocket): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Uint8Array[] = []
      const timer = setTimeout(() => {
        cleanup()
        reject(new Error(`[FTPSClient] data channel timeout after ${this.timeout}ms`))
      }, this.timeout)
      const cleanup = () => clearTimeout(timer)
      data.addEventListener('message', (event) => {
        chunks.push(new Uint8Array(event.data as ArrayBuffer))
      })
      data.addEventListener('close', () => {
        cleanup()
        resolve(chunks.map(chunk => new TextDecoder().decode(chunk)).join(''))
      })
      data.addEventListener('error', () => {
        cleanup()
        reject(new Error('[FTPSClient] data channel error'))
      })
    })
  }
}
