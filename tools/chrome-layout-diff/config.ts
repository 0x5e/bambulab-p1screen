import type { BrowserTarget, ChromeTargetId, FixtureName, Viewport } from './types'

export const browserTargetId = (target: BrowserTarget): ChromeTargetId => String(target.major)

export const browserTargetImage = (target: BrowserTarget) => `selenoid/chrome:${target.major}.0`

export const viewportId = (viewport: Viewport) => `${viewport.width}x${viewport.height}`

export const browserTargets: BrowserTarget[] = [
  { major: 115, kind: 'docker', baseline: true },
  { major: 76, kind: 'docker' },
  { major: 66, kind: 'docker' },
  // { major: 57, kind: 'docker-cdp' },
]

export const baselineTarget: ChromeTargetId = (() => {
  const target = browserTargets.find(browserTarget => browserTarget.baseline)
  if (!target) throw new Error('Missing baseline browser target')
  return browserTargetId(target)
})()

export const layoutTolerancePx = 2

export const ignoreStyleProperties = [
  'overflow',
  'overflowX',
  'overflowY',
  'gridTemplateColumns',
  'gridTemplateRows',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
]

export const viewports: Viewport[] = [
  { width: 320, height: 568 },
  // { width: 375, height: 667 },
  // { width: 390, height: 844 },
  { width: 430, height: 932 },

  { width: 568, height: 320 },
  // { width: 667, height: 375 },
  // { width: 844, height: 390 },
  { width: 932, height: 430 },
]

export const outputDir = 'chrome-layout-diff-results'
export const fixtureDir = 'tools/chrome-layout-diff/fixtures'

export const dockerHostAlias = 'chrome-layout-diff-host'

export const fixtureRoutes: Partial<Record<FixtureName, string[]>> = {
  P1S_FINISH: ['/home'],
  P1S_PRINT_ERROR: ['/home'],
  P1S_NO_AMS: ['/filament'],
  P1S_TWO_AMS: ['/filament'],
  P1S_HMS_WARNING: ['/home', '/message'],
}

export const ignoreSelectors = [
  // '.hint',
]
