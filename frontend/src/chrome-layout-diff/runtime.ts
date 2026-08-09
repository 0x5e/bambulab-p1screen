import { client } from '../printer'
import type { DeviceRecord } from '../utils/device'
import { CURRENT_DEVICE_KEY, DEVICE_STORAGE_KEY } from '../utils/device'
import type { ChromeLayoutDiffFixture, ChromeLayoutDiffFixtureName, ChromeLayoutDiffFixturePayload } from './types'

const QUERY_PARAM = '__chromeLayoutDiffFixture'
const STORAGE_KEY = '__P1SCREEN_CHROME_LAYOUT_DIFF_FIXTURE__'

const isChromeLayoutDiffFixtureName = (value: unknown): value is ChromeLayoutDiffFixtureName => (
  typeof value === 'string' && /^[A-Za-z0-9_-]+$/.test(value)
)

const getFixtureName = (): ChromeLayoutDiffFixtureName | null => {
  const fromWindow = window.__P1SCREEN_CHROME_LAYOUT_DIFF_FIXTURE__
  if (isChromeLayoutDiffFixtureName(fromWindow)) return fromWindow

  const fromQuery = new URLSearchParams(window.location.search).get(QUERY_PARAM)
  if (isChromeLayoutDiffFixtureName(fromQuery)) return fromQuery

  const fromStorage = window.sessionStorage.getItem(STORAGE_KEY)
  if (isChromeLayoutDiffFixtureName(fromStorage)) return fromStorage

  return null
}

const loadFixturePayload = (name: ChromeLayoutDiffFixtureName): ChromeLayoutDiffFixturePayload => {
  if (window.__P1SCREEN_CHROME_LAYOUT_DIFF_FIXTURE_DATA__) {
    return window.__P1SCREEN_CHROME_LAYOUT_DIFF_FIXTURE_DATA__
  }

  const request = new XMLHttpRequest()
  request.open('GET', `/__chrome-layout-diff-fixtures/${encodeURIComponent(name)}.json`, false)
  request.send()
  if (request.status < 200 || request.status >= 300) {
    throw new Error(`[ChromeLayoutDiff] failed to load fixture ${name}: ${request.status}`)
  }
  return JSON.parse(request.responseText) as ChromeLayoutDiffFixturePayload
}

const createFallbackDeviceRecord = (payload: ChromeLayoutDiffFixturePayload): DeviceRecord | null => {
  if (!payload.print && !payload.modules && !payload.module) return null

  const moduleSerial = payload.module?.[0]?.sn ?? payload.modules?.[0]?.sn
  const serial = moduleSerial || 'chrome-layout-diff-device'
  return {
    name: String(payload.module?.[0]?.product_name ?? payload.modules?.[0]?.product_name ?? serial),
    ip: '127.0.0.1',
    serial,
    code: 'chrome-layout-diff',
    from: 'local',
    connect: 'local',
  }
}

const normalizeFixture = (name: ChromeLayoutDiffFixtureName, payload: ChromeLayoutDiffFixturePayload): ChromeLayoutDiffFixture => ({
  name,
  deviceRecord: payload.deviceRecord ?? createFallbackDeviceRecord(payload),
  print: payload.print,
  modules: payload.modules ?? payload.module,
})

export const installChromeLayoutDiffRuntime = () => {
  if (typeof window === 'undefined') return

  const fixtureName = getFixtureName()
  if (!fixtureName) return

  Math.random = () => 0

  const fixture = normalizeFixture(fixtureName, loadFixturePayload(fixtureName))
  window.sessionStorage.clear()
  window.sessionStorage.setItem(STORAGE_KEY, fixture.name)
  window.localStorage.setItem('app_locale', 'en')

  if (fixture.deviceRecord) {
    window.localStorage.setItem(DEVICE_STORAGE_KEY, JSON.stringify([fixture.deviceRecord]))
    window.localStorage.setItem(CURRENT_DEVICE_KEY, fixture.deviceRecord.serial)
  } else {
    window.localStorage.removeItem(DEVICE_STORAGE_KEY)
    window.localStorage.removeItem(CURRENT_DEVICE_KEY)
  }

  client.disconnect()
  client.device.print = fixture.print
  client.device.module = fixture.modules
  client.connectOptions = fixture.deviceRecord
    ? {
      mqttUrl: 'ws://chrome-layout-diff.invalid/mqtt',
      username: 'bblp',
      password: fixture.deviceRecord.code,
      serial: fixture.deviceRecord.serial,
    }
    : null
  client.mqttClient = fixture.deviceRecord
    ? ({
      connected: true,
      removeAllListeners: () => {},
      end: () => {},
    } as any)
    : null

  client.connect = ((options: any) => {
    client.connectOptions = options
    return client.mqttClient
  }) as typeof client.connect
  client.disconnect = (() => {
    client.mqttClient = null
    client.connectOptions = null
  }) as typeof client.disconnect
  client.request = (async (_command: string, params?: Record<string, any>) => params ?? {}) as typeof client.request

  const style = document.createElement('style')
  style.setAttribute('data-chrome-layout-diff-runtime', 'true')
  style.textContent = `
    *, *::before, *::after {
      animation-duration: 0.001ms !important;
      animation-delay: 0s !important;
      transition-duration: 0s !important;
      transition-delay: 0s !important;
      caret-color: transparent !important;
    }
  `
  document.head.appendChild(style)

  document.documentElement.setAttribute('data-chrome-layout-diff-fixture', fixture.name)
}
