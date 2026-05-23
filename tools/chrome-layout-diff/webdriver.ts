import { spawn, type ChildProcess } from 'node:child_process'
import path from 'node:path'
import { browserTargetId, browserTargetImage, dockerHostAlias } from './config'
import type { BrowserTarget, ChromeTargetId, DomSnapshot, Viewport } from './types'
import { domCaptureScript } from './capture-script'

type WebDriverSession = {
  id: string
  capabilities: Record<string, any>
  legacyWebDriver: boolean
}

type CaptureResult = {
  snapshot: DomSnapshot
  screenshotBase64: string
  browserVersion: string
}

export type LayoutCaptureSession = {
  capture: (url: string, ignoreSelectors: string[]) => Promise<CaptureResult>
  stop: () => Promise<void>
}

type ManagedDriver = {
  target: BrowserTarget
  targetId: ChromeTargetId
  endpoint: string
  debugEndpoint?: string
  image: string
  startCaptureSession?: (viewport: Viewport) => Promise<LayoutCaptureSession>
  stop: () => Promise<void>
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const request = async <T>(endpoint: string, method: string, body?: unknown): Promise<T> => {
  const response = await fetch(endpoint, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || (data && typeof data.status === 'number' && data.status !== 0)) {
    throw new Error(`WebDriver ${method} ${endpoint} failed: ${response.status} ${JSON.stringify(data)}`)
  }
  return data as T
}

const readPngSize = (base64: string) => {
  const buffer = Buffer.from(base64, 'base64')
  if (buffer.length < 24 || buffer.toString('ascii', 1, 4) !== 'PNG') {
    throw new Error('Screenshot is not a PNG image')
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  }
}

const cdpProxyPath = () => path.join(process.cwd(), 'tools/chrome-layout-diff/cdp-proxy.py')

const dockerRunArgs = (containerName: string) => [
  'run',
  '--rm',
  '--platform=linux/amd64',
  '--name',
  containerName,
  '--add-host',
  `${dockerHostAlias}:host-gateway`,
]

const waitForDebugPage = async (debugEndpoint: string) => {
  for (let i = 0; i < 80; i += 1) {
    try {
      const targets = await request<Array<{ type?: string, url?: string, webSocketDebuggerUrl?: string }>>(`${debugEndpoint}/json`, 'GET')
      const page = targets.find(target => target.type === 'page' && target.url && target.url !== 'data:,')
        ?? targets.find(target => target.type === 'page')
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl
    } catch {
      // Chrome may need a moment to expose the debug target.
    }
    await sleep(250)
  }
  throw new Error(`Timed out waiting for Chrome debug page at ${debugEndpoint}`)
}

const cdpCommand = async <T>(webSocketDebuggerUrl: string, method: string, params: unknown): Promise<T> => (
  await new Promise<T>((resolve, reject) => {
    const socket = new WebSocket(webSocketDebuggerUrl)
    const id = 1
    const timer = setTimeout(() => {
      socket.close()
      reject(new Error(`Timed out waiting for CDP ${method}`))
    }, 10000)

    socket.addEventListener('open', () => {
      socket.send(JSON.stringify({ id, method, params }))
    })
    socket.addEventListener('message', event => {
      const message = JSON.parse(String(event.data))
      if (message.id !== id) return
      clearTimeout(timer)
      socket.close()
      if (message.error) {
        reject(new Error(`CDP ${method} failed: ${JSON.stringify(message.error)}`))
        return
      }
      resolve(message.result as T)
    })
    socket.addEventListener('error', () => {
      clearTimeout(timer)
      reject(new Error(`CDP ${method} websocket error`))
    })
  })
)

const waitForCdpPage = async (debugEndpoint: string) => {
  for (let i = 0; i < 120; i += 1) {
    try {
      const targets = await request<Array<{ type?: string, url?: string, webSocketDebuggerUrl?: string }>>(`${debugEndpoint}/json`, 'GET')
      const page = targets.find(target => target.type === 'page')
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl
    } catch {
      // CDP proxy and Chrome need a moment to become available under QEMU.
    }
    await sleep(250)
  }
  throw new Error(`Timed out waiting for CDP page at ${debugEndpoint}`)
}

const cdpEvaluate = async <T>(webSocketDebuggerUrl: string, script: string): Promise<T> => {
  const result = await cdpCommand<{ result?: { value?: string }, exceptionDetails?: unknown }>(webSocketDebuggerUrl, 'Runtime.evaluate', {
    expression: `JSON.stringify((function(){${script}\n})())`,
    returnByValue: true,
  })
  if (result.exceptionDetails) {
    throw new Error(`CDP Runtime.evaluate failed: ${JSON.stringify(result.exceptionDetails)}`)
  }
  const value = result.result?.value
  if (typeof value !== 'string') {
    throw new Error('CDP Runtime.evaluate did not return JSON')
  }
  return JSON.parse(value) as T
}

const validateCaptureSize = (
  target: BrowserTarget,
  viewport: Viewport,
  snapshot: DomSnapshot,
  screenshotBase64: string,
) => {
  const size = readPngSize(screenshotBase64)
  if (
    snapshot.viewport.width !== viewport.width
    || snapshot.viewport.height !== viewport.height
    || snapshot.appRect.width !== viewport.width
    || snapshot.appRect.height !== viewport.height
    || size.width !== viewport.width
    || size.height !== viewport.height
  ) {
    throw new Error([
      `Capture viewport mismatch for ${browserTargetId(target)}: expected ${viewport.width}x${viewport.height}`,
      `snapshot viewport ${snapshot.viewport.width}x${snapshot.viewport.height}`,
      `app ${snapshot.appRect.width}x${snapshot.appRect.height}`,
      `png ${size.width}x${size.height}`,
    ].join(', '))
  }
}

const startDockerCdpCaptureSession = async (
  driver: ManagedDriver,
  viewport: Viewport,
): Promise<LayoutCaptureSession> => {
  const debugHostPort = Number(process.env[envKey('CHROME_LAYOUT_DIFF_CDP_PORT', driver.targetId)] ?? '9223')
  const containerName = `chrome-layout-diff-cdp-${driver.targetId}-${Date.now()}`
  const xvfbHeight = viewport.height + 39
  const child = spawn('docker', [
    ...dockerRunArgs(containerName),
    '-p',
    `${debugHostPort}:9223`,
    '--shm-size=2g',
    '-v',
    `${cdpProxyPath()}:/tmp/cdp-proxy.py:ro`,
    '--entrypoint',
    '/bin/sh',
    driver.image,
    '-c',
    [
      'python3 -u /tmp/cdp-proxy.py &',
      `xvfb-run -l -n 99 -s "-ac -screen 0 ${viewport.width}x${xvfbHeight}x24 -noreset -listen tcp"`,
      '/usr/bin/google-chrome',
      '--no-first-run',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-background-networking',
      '--disable-default-apps',
      '--disable-extensions',
      '--disable-popup-blocking',
      '--force-device-scale-factor=1',
      '--remote-debugging-port=9222',
      '--user-data-dir=/tmp/layout-cdp-profile',
      '--start-fullscreen',
      'about:blank',
    ].join(' '),
  ], { stdio: ['ignore', 'pipe', 'pipe'] })
  child.stdout?.on('data', data => process.stdout.write(`[docker-cdp:${driver.targetId}] ${data}`))
  child.stderr?.on('data', data => process.stderr.write(`[docker-cdp:${driver.targetId}] ${data}`))

  const debugEndpoint = `http://127.0.0.1:${debugHostPort}`
  const stop = async () => {
    await stopProcess(child)
    await stopDockerContainer(containerName)
  }

  try {
    const webSocketDebuggerUrl = await waitForCdpPage(debugEndpoint)
    const version = await request<{ Browser?: string }>(`${debugEndpoint}/json/version`, 'GET')
    const browserVersion = String(version.Browser ?? '').replace(/^Chrome\//, '')
    if (!browserVersion.startsWith(`${driver.target.major}.`)) {
      throw new Error(`Expected Chrome ${driver.target.major}.x for ${driver.targetId}, got ${browserVersion}`)
    }

    await cdpCommand(webSocketDebuggerUrl, 'Page.enable', {})
    await cdpCommand(webSocketDebuggerUrl, 'Runtime.enable', {})

    return {
      capture: async (url, ignoreSelectors) => {
        await cdpCommand(webSocketDebuggerUrl, 'Page.navigate', { url })
        let pageReady = false
        for (let i = 0; i < 80; i += 1) {
          const ready = await cdpEvaluate<boolean>(webSocketDebuggerUrl, `
            return document.readyState === 'complete'
              && !!document.querySelector('#app')
              && Array.prototype.every.call(document.images, function (img) { return img.complete; });
          `)
          if (ready) {
            pageReady = true
            break
          }
          await sleep(250)
        }
        if (!pageReady) {
          throw new Error(`Timed out waiting for stable page in Chrome ${driver.targetId}`)
        }
        await sleep(100)

        await cdpEvaluate<void>(webSocketDebuggerUrl, `window.__chromeLayoutDiffIgnoreSelectors = ${JSON.stringify(ignoreSelectors)}; return null;`)
        const snapshot = await cdpEvaluate<DomSnapshot>(webSocketDebuggerUrl, domCaptureScript)
        const screenshot = await cdpCommand<{ data: string }>(webSocketDebuggerUrl, 'Page.captureScreenshot', { format: 'png' })
        validateCaptureSize(driver.target, viewport, snapshot, screenshot.data)
        return { snapshot, screenshotBase64: screenshot.data, browserVersion }
      },
      stop,
    }
  } catch (error) {
    await stop()
    throw error
  }
}

const envKey = (prefix: string, target: ChromeTargetId) => `${prefix}_${target.replace(/-/g, '_').toUpperCase()}`
const webdriverHostPort = 4444

const joinEndpoint = (endpoint: string, commandPath: string) => (
  `${endpoint.replace(/\/+$/, '')}/${commandPath.replace(/^\/+/, '')}`
)

const waitForDriver = async (endpoint: string, attempts = 600) => {
  for (let i = 0; i < attempts; i += 1) {
    try {
      await request(joinEndpoint(endpoint, '/status'), 'GET')
      return
    } catch {
      await sleep(500)
    }
  }
  throw new Error(`Timed out waiting for WebDriver at ${endpoint}`)
}

const startDockerDriver = async (target: BrowserTarget): Promise<ManagedDriver> => {
  const targetId = browserTargetId(target)
  const image = browserTargetImage(target)
  const debugHostPort = target.debugHostPort
  const containerName = `chrome-layout-diff-chrome-${targetId}-${Date.now()}`
  const dockerArgs = [
    ...dockerRunArgs(containerName),
    '-p',
    `${webdriverHostPort}:4444`,
    ...(debugHostPort ? ['-p', `${debugHostPort}:9222`] : []),
    '--shm-size=2g',
    '--entrypoint',
    '/bin/sh',
    image,
    '-c',
    'SCREEN_RESOLUTION="${SCREEN_RESOLUTION:-1920x1080x24}"; xvfb-run -l -n 99 -s "-ac -screen 0 $SCREEN_RESOLUTION -noreset -listen tcp" /usr/bin/chromedriver --port=4444 --whitelisted-ips=""',
  ]
  const child = spawn('docker', dockerArgs, { stdio: ['ignore', 'pipe', 'pipe'] })
  child.stdout?.on('data', data => process.stdout.write(`[docker:${targetId}] ${data}`))
  child.stderr?.on('data', data => process.stderr.write(`[docker:${targetId}] ${data}`))

  const endpoint = `http://127.0.0.1:${webdriverHostPort}`
  try {
    await waitForDriver(endpoint)
  } catch (error) {
    await stopProcess(child)
    await stopDockerContainer(containerName)
    throw error
  }

  return {
    target,
    targetId,
    endpoint,
    image,
    ...(debugHostPort ? { debugEndpoint: `http://127.0.0.1:${debugHostPort}` } : {}),
    stop: async () => {
      await stopProcess(child)
      await stopDockerContainer(containerName)
    },
  }
}

export const startDriver = async (target: BrowserTarget): Promise<ManagedDriver> => {
  const targetId = browserTargetId(target)
  const image = browserTargetImage(target)
  const externalEndpoint = process.env[envKey('CHROME_LAYOUT_DIFF_WEBDRIVER', targetId)] ?? process.env.CHROME_LAYOUT_DIFF_WEBDRIVER_URL
  if (externalEndpoint) {
    return {
      target,
      targetId,
      endpoint: externalEndpoint.replace(/\/$/, ''),
      image,
      stop: async () => {},
    }
  }

  if (target.kind === 'docker-cdp') {
    return {
      target,
      targetId,
      endpoint: '',
      image,
      startCaptureSession: viewport => startDockerCdpCaptureSession({
        target,
        targetId,
        endpoint: '',
        image,
        stop: async () => {},
      }, viewport),
      stop: async () => {},
    }
  }

  if (target.kind === 'docker') {
    return startDockerDriver(target)
  }

  throw new Error(`Unsupported browser target kind for ${targetId}: ${target.kind}`)
}

const stopProcess = async (child: ChildProcess) => {
  if (child.exitCode !== null || child.signalCode !== null) return
  child.kill()
  await Promise.race([
    new Promise<void>(resolve => child.once('exit', () => resolve())),
    sleep(3000),
  ])
  if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL')
}

const stopDockerContainer = async (containerName: string) => {
  await new Promise<void>(resolve => {
    const child = spawn('docker', ['stop', containerName], { stdio: 'ignore' })
    child.once('exit', () => resolve())
    child.once('error', () => resolve())
  })
}

const createSession = async (driver: ManagedDriver, viewport: Viewport): Promise<WebDriverSession> => {
  const mobileEmulation = {
    deviceMetrics: {
      width: viewport.width,
      height: viewport.height,
      pixelRatio: 1,
      touch: true,
      mobile: true,
    },
  }
  const body = {
    capabilities: {
      alwaysMatch: {
        browserName: 'chrome',
        'goog:chromeOptions': {
          mobileEmulation,
          args: [
            '--no-first-run',
            '--no-sandbox',
            '--disable-background-networking',
            '--disable-default-apps',
            '--disable-dev-shm-usage',
            '--disable-extensions',
            '--disable-popup-blocking',
            '--force-device-scale-factor=1',
            ...(driver.debugEndpoint ? ['--remote-debugging-address=0.0.0.0', '--remote-debugging-port=9222'] : []),
            `--window-size=${viewport.width},${viewport.height}`,
          ],
        },
      },
    },
    desiredCapabilities: {
      browserName: 'chrome',
      chromeOptions: {
        mobileEmulation,
        args: [
          '--no-first-run',
          '--no-sandbox',
          '--disable-background-networking',
          '--disable-default-apps',
          '--disable-dev-shm-usage',
          '--disable-extensions',
          '--disable-popup-blocking',
          '--force-device-scale-factor=1',
          ...(driver.debugEndpoint ? ['--remote-debugging-address=0.0.0.0', '--remote-debugging-port=9222'] : []),
          `--window-size=${viewport.width},${viewport.height}`,
        ],
      },
    },
  }
  const response = await request<any>(`${driver.endpoint}/session`, 'POST', body)
  const value = response.value ?? response
  const sessionId = value.sessionId ?? response.sessionId
  if (!sessionId) throw new Error(`Failed to create WebDriver session: ${JSON.stringify(response)}`)
  return {
    id: sessionId,
    capabilities: value.capabilities ?? response.value ?? {},
    legacyWebDriver: Boolean(response.status === 0 && !value.capabilities),
  }
}

const deleteSession = async (driver: ManagedDriver, sessionId: string) => {
  await request(joinEndpoint(driver.endpoint, `/session/${sessionId}`), 'DELETE').catch(() => undefined)
}

const command = async <T>(driver: ManagedDriver, sessionId: string, path: string, method: string, body?: unknown): Promise<T> => {
  const data = await request<any>(joinEndpoint(driver.endpoint, `/session/${sessionId}${path}`), method, body)
  return (data.value ?? data) as T
}

const waitForStablePage = async (driver: ManagedDriver, session: WebDriverSession) => {
  for (let i = 0; i < 80; i += 1) {
    const ready = await executeScript<boolean>(driver, session, `
      return document.readyState === 'complete'
        && !!document.querySelector('#app')
        && Array.prototype.every.call(document.images, function (img) { return img.complete; });
    `)
    if (ready) {
      await sleep(100)
      return
    }
    await sleep(250)
  }
  throw new Error(`Timed out waiting for stable page in Chrome ${driver.targetId}`)
}

const executeScript = async <T>(driver: ManagedDriver, session: WebDriverSession, script: string, args: unknown[] = []): Promise<T> => {
  if (session.legacyWebDriver) {
    return await command<T>(driver, session.id, '/execute', 'POST', { script, args })
  }
  try {
    return await command<T>(driver, session.id, '/execute/sync', 'POST', { script, args })
  } catch (error: any) {
    if (!String(error?.message ?? '').includes('unknown command')) {
      throw error
    }
    return await command<T>(driver, session.id, '/execute', 'POST', { script, args })
  }
}

const captureViewportScreenshot = async (
  driver: ManagedDriver,
  session: WebDriverSession,
  viewport: Viewport,
): Promise<string> => {
  if (driver.debugEndpoint) {
    const webSocketDebuggerUrl = await waitForDebugPage(driver.debugEndpoint)
    const result = await cdpCommand<{ data: string }>(webSocketDebuggerUrl, 'Page.captureScreenshot', {
      format: 'png',
      fromSurface: true,
      clip: {
        x: 0,
        y: 0,
        width: viewport.width,
        height: viewport.height,
        scale: 1,
      },
    })
    const size = readPngSize(result.data)
    if (size.width !== viewport.width || size.height !== viewport.height) {
      throw new Error(`CDP screenshot size mismatch: expected ${viewport.width}x${viewport.height}, got ${size.width}x${size.height}`)
    }
    return result.data
  }

  const cdpPaths = [
    '/chromium/send_command_and_get_result',
    '/goog/cdp/execute',
  ]
  for (const path of cdpPaths) {
    try {
      const result = await command<{ data?: string }>(driver, session.id, path, 'POST', {
        cmd: 'Page.captureScreenshot',
        params: {
          format: 'png',
          fromSurface: true,
          clip: {
            x: 0,
            y: 0,
            width: viewport.width,
            height: viewport.height,
            scale: 1,
          },
        },
      })
      if (result?.data) return result.data
    } catch {
      // Older ChromeDriver builds do not expose CDP commands.
    }
  }
  const screenshot = await command<string>(driver, session.id, '/screenshot', 'GET')
  const size = readPngSize(screenshot)
  if (size.width !== viewport.width || size.height !== viewport.height) {
    throw new Error(`WebDriver screenshot size mismatch: expected ${viewport.width}x${viewport.height}, got ${size.width}x${size.height}`)
  }
  return screenshot
}

export const captureLayout = async (
  driver: ManagedDriver,
  url: string,
  viewport: Viewport,
  ignoreSelectors: string[] = [],
) => {
  const session = await startLayoutCaptureSession(driver, viewport)
  try {
    return await session.capture(url, ignoreSelectors)
  } finally {
    await session.stop()
  }
}

export const startLayoutCaptureSession = async (
  driver: ManagedDriver,
  viewport: Viewport,
): Promise<LayoutCaptureSession> => {
  if (driver.startCaptureSession) return await driver.startCaptureSession(viewport)

  const session = await createSession(driver, viewport)
  let stopped = false
  try {
    const actualVersion = String(session.capabilities.browserVersion ?? session.capabilities.version ?? '')
    if (!actualVersion.startsWith(`${driver.target.major}.`)) {
      throw new Error(`Expected Chrome ${driver.target.major}.x for ${driver.targetId}, got ${actualVersion}`)
    }

    await command(driver, session.id, '/window/rect', 'POST', {
      width: viewport.width,
      height: viewport.height,
      x: 0,
      y: 0,
    }).catch(() => undefined)

    return {
      capture: async (url, ignoreSelectors) => {
        return await captureLayoutAttempt(driver, session, actualVersion, url, viewport, ignoreSelectors)
      },
      stop: async () => {
        if (stopped) return
        stopped = true
        await deleteSession(driver, session.id)
      },
    }
  } catch (error) {
    await deleteSession(driver, session.id)
    throw error
  }
}

const withRetries = async <T>(operation: () => Promise<T>) => {
  let lastError: unknown
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      if (attempt === 5) break
      await sleep(500 * attempt)
    }
  }
  throw lastError
}

const captureLayoutAttempt = async (
  driver: ManagedDriver,
  session: WebDriverSession,
  actualVersion: string,
  url: string,
  viewport: Viewport,
  ignoreSelectors: string[],
) => {
  return await withRetries(async () => {
    await command(driver, session.id, '/url', 'POST', { url })
    await waitForStablePage(driver, session)
    await executeScript<void>(driver, session, `window.__chromeLayoutDiffIgnoreSelectors = ${JSON.stringify(ignoreSelectors)}`)
    const snapshot = await executeScript<DomSnapshot>(driver, session, domCaptureScript)
    const screenshotBase64 = await captureViewportScreenshot(driver, session, viewport)
    validateCaptureSize(driver.target, viewport, snapshot, screenshotBase64)
    return { snapshot, screenshotBase64, browserVersion: actualVersion }
  })
}
