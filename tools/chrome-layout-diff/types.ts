export type ChromeTargetId = string

export type Viewport = {
  width: number
  height: number
}

export type FixtureName = string

export type FixturePayload = {
  name?: string
  deviceRecord?: { serial?: string } | null
  print?: unknown
  module?: unknown
  modules?: unknown
  project?: unknown
}

export type BrowserTarget = {
  major: number
  kind: 'docker' | 'docker-cdp'
  baseline?: true
  debugHostPort?: number
}

export type RouteCase = {
  name: string
  path: string
}

export type LayoutCase = {
  target: ChromeTargetId
  viewport: Viewport
  route: RouteCase
  fixture: FixtureName
  ignoreSelectors: string[]
}

export type RectSnapshot = {
  x: number
  y: number
  width: number
  height: number
  top: number
  right: number
  bottom: number
  left: number
}

export type ElementSnapshot = {
  path: string
  tag: string
  id: string
  classes: string[]
  textHash: string
  appRect: RectSnapshot
  viewportRect: RectSnapshot
  clientWidth: number
  clientHeight: number
  scrollWidth: number
  scrollHeight: number
  offsetWidth: number
  offsetHeight: number
  styles: Record<string, string>
}

export type DomSnapshot = {
  url: string
  title: string
  appRect: RectSnapshot
  viewport: {
    width: number
    height: number
    devicePixelRatio: number
  }
  elements: ElementSnapshot[]
}

export type LayoutDifference = {
  path: string
  type: 'missing' | 'added' | 'text' | 'rect' | 'box' | 'style'
  metric?: string
  expected?: string | number
  actual?: string | number
  delta?: number
}

export type CaseResult = {
  caseId: string
  target: ChromeTargetId
  baselineTarget: ChromeTargetId
  viewport: Viewport
  route: RouteCase
  fixture: FixtureName
  passed: boolean
  differences: LayoutDifference[]
  actualPath?: string
  baselinePath?: string
  screenshotPath?: string
  baselineScreenshotPath?: string
}
