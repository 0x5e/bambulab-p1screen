import fs from 'node:fs'
import path from 'node:path'
import { baselineTarget, browserTargetId, browserTargets, dockerHostAlias, outputDir, viewportId, viewports } from './config'
import { diffSnapshots } from './diff'
import { getFixtureNames, validateFixtureFiles } from './fixture-loader'
import { buildMatrix } from './matrix'
import { writeReport } from './report'
import { filterRoutes } from './routes'
import { startStaticServer } from './static-server'
import { startDriver, startLayoutCaptureSession, type LayoutCaptureSession } from './webdriver'
import type { CaseResult, ChromeTargetId, DomSnapshot, FixtureName, RouteCase, Viewport } from './types'

type CliOptions = {
  targets?: ChromeTargetId[]
  routes?: string[]
  fixtures?: FixtureName[]
  viewports?: string[]
}

const parseList = <T extends string>(value: string | undefined) => (
  value ? value.split(',').map(item => item.trim()).filter(Boolean) as T[] : undefined
)

const parseCliOptions = (): CliOptions => {
  const args = process.argv.slice(2)
  const options: CliOptions = {}
  for (const arg of args) {
    if (arg.startsWith('--targets=')) options.targets = parseList<ChromeTargetId>(arg.slice('--targets='.length))
    if (arg.startsWith('--routes=')) options.routes = parseList(arg.slice('--routes='.length))
    if (arg.startsWith('--fixtures=')) options.fixtures = parseList<FixtureName>(arg.slice('--fixtures='.length))
    if (arg.startsWith('--viewports=')) options.viewports = parseList(arg.slice('--viewports='.length))
  }
  return options
}

const caseId = (target: ChromeTargetId, viewport: Viewport, route: RouteCase, fixture: FixtureName) => (
  [target, viewportId(viewport), route.name, fixture].map(part => String(part).replace(/[^a-z0-9_-]+/gi, '_')).join('__')
)

const snapshotKey = (viewport: Viewport, route: RouteCase, fixture: FixtureName) => (
  [viewportId(viewport), route.name, fixture].join('::')
)

const ensureDir = (dir: string) => fs.mkdirSync(dir, { recursive: true })

const writeJson = (filePath: string, value: unknown) => {
  ensureDir(path.dirname(filePath))
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

const writeBase64 = (filePath: string, value: string) => {
  ensureDir(path.dirname(filePath))
  fs.writeFileSync(filePath, Buffer.from(value, 'base64'))
}

const formatDuration = (durationMs: number) => {
  const seconds = durationMs / 1000
  if (seconds < 60) return `${seconds.toFixed(1)}s`
  const minutes = Math.floor(seconds / 60)
  return `${minutes}m ${(seconds - minutes * 60).toFixed(1)}s`
}

const makeUrl = (baseUrl: string, route: RouteCase, fixture: FixtureName, caseKey: string) => {
  const url = new URL(baseUrl)
  url.searchParams.set('__chromeLayoutDiffFixture', fixture)
  url.searchParams.set('__chromeLayoutDiffCase', caseKey)
  url.hash = route.path
  return url.toString()
}

const makeBrowserUrl = (baseUrl: string, route: RouteCase, fixture: FixtureName, caseKey: string) => {
  const url = new URL(makeUrl(baseUrl, route, fixture, caseKey))
  url.hostname = dockerHostAlias
  return url.toString()
}

const selectViewports = (ids: string[] | undefined) => {
  if (!ids?.length) return viewports
  const selected = new Set(ids)
  return viewports.filter(viewport => selected.has(viewportId(viewport)))
}

const main = async () => {
  const rootDir = process.cwd()
  const options = parseCliOptions()
  const selectedTargets = options.targets ?? browserTargets.map(browserTargetId)
  const orderedTargets = [
    baselineTarget,
    ...selectedTargets.filter(target => target !== baselineTarget),
  ].filter((target, index, list) => list.indexOf(target) === index)
  const selectedFixtures = options.fixtures ?? getFixtureNames(rootDir)
  const selectedViewports = selectViewports(options.viewports)
  const selectedRoutes = filterRoutes(options.routes)

  validateFixtureFiles(rootDir, selectedFixtures)

  const runOutputDir = path.join(rootDir, outputDir)
  fs.rmSync(runOutputDir, { recursive: true, force: true })
  ensureDir(runOutputDir)

  const server = await startStaticServer(rootDir)
  const snapshots = new Map<string, { snapshot: DomSnapshot, filePath: string, screenshotPath: string }>()
  const results: CaseResult[] = []

  try {
    for (const targetId of orderedTargets) {
      const browserTarget = browserTargets.find(target => browserTargetId(target) === targetId)
      if (!browserTarget) throw new Error(`Unknown browser target: ${targetId}`)
      const targetIdForRun = browserTargetId(browserTarget)
      const driver = await startDriver(browserTarget)
      try {
        const cases = buildMatrix([targetIdForRun], selectedRoutes, selectedViewports, selectedFixtures)
        for (const viewport of selectedViewports) {
          const viewportIdForRun = viewportId(viewport)
          const viewportCases = cases.filter(layoutCase => viewportId(layoutCase.viewport) === viewportIdForRun)
          if (!viewportCases.length) continue

          let captureSession: LayoutCaptureSession | null = null
          const ensureCaptureSession = async () => {
            if (!captureSession) {
              console.log(`[layout] ${targetIdForRun} ${viewportIdForRun} capture session (${viewportCases.length} case(s))`)
              captureSession = await startLayoutCaptureSession(driver, viewport)
            }
            return captureSession
          }

          try {
            for (const layoutCase of viewportCases) {
              const id = caseId(layoutCase.target, layoutCase.viewport, layoutCase.route, layoutCase.fixture)
              const snapshotPath = path.join(runOutputDir, 'snapshots', `${id}.json`)
              const screenshotPath = path.join(runOutputDir, 'screenshots', `${id}.png`)

              console.log(`[layout] ${id}`)
              const url = makeBrowserUrl(server.baseUrl, layoutCase.route, layoutCase.fixture, id)
              const capture = await (await ensureCaptureSession()).capture(url, layoutCase.ignoreSelectors)
              const actualSnapshot = capture.snapshot
              writeJson(snapshotPath, actualSnapshot)
              writeBase64(screenshotPath, capture.screenshotBase64)

              if (layoutCase.target === baselineTarget) {
                snapshots.set(snapshotKey(layoutCase.viewport, layoutCase.route, layoutCase.fixture), {
                  snapshot: actualSnapshot,
                  filePath: snapshotPath,
                  screenshotPath,
                })
                continue
              }

              const baseline = snapshots.get(snapshotKey(layoutCase.viewport, layoutCase.route, layoutCase.fixture))
              if (!baseline) {
                throw new Error(`Missing baseline snapshot for ${id}. Ensure ${baselineTarget} runs before comparison targets.`)
              }

              const differences = diffSnapshots(baseline.snapshot, actualSnapshot)
              results.push({
                caseId: id,
                target: layoutCase.target,
                baselineTarget,
                viewport: layoutCase.viewport,
                route: layoutCase.route,
                fixture: layoutCase.fixture,
                passed: differences.length === 0,
                differences,
                actualPath: snapshotPath,
                baselinePath: baseline.filePath,
                screenshotPath,
                baselineScreenshotPath: baseline.screenshotPath,
              })
            }
          } finally {
            await captureSession?.stop()
          }
        }
      } finally {
        await driver.stop()
      }
    }
  } finally {
    await server.close()
  }

  const resultsPath = path.join(runOutputDir, 'chrome-layout-diff-results.json')
  const reportPath = path.join(runOutputDir, 'chrome-layout-diff-report.html')
  writeJson(resultsPath, results)
  writeReport(reportPath, results)

  const failures = results.filter(result => !result.passed)
  console.log(`[layout] wrote ${resultsPath}`)
  console.log(`[layout] wrote ${reportPath}`)
  if (failures.length > 0) {
    console.error(`[layout] ${failures.length} layout comparison(s) failed`)
    process.exitCode = 1
  }
}

const startedAt = Date.now()

main().catch(error => {
  console.error(error)
  process.exitCode = 1
}).finally(() => {
  console.log(`[layout] total time ${formatDuration(Date.now() - startedAt)}`)
})
