import fs from 'node:fs'
import path from 'node:path'
import type { RouteCase } from './types'

const dynamicParamDefaults: Record<string, string> = {
  ams_id: '0',
  tray_id: '0',
  serial: 'chrome-layout-diff-device',
}

export const expandRoutePath = (path: string) => (
  path.replace(/:([A-Za-z0-9_]+)/g, (_match, key: string) => dynamicParamDefaults[key] ?? `fixture-${key}`)
)

export const parseLayoutRoutes = (source: string): RouteCase[] => {
  const routeObjectPattern = /\{[^{}]*path:\s*['"]([^'"]+)['"][^{}]*\}/g
  const routes: RouteCase[] = []

  for (const match of source.matchAll(routeObjectPattern)) {
    const routeObject = match[0]
    if (routeObject.includes('redirect:')) continue

    const routePath = match[1]
    const nameMatch = routeObject.match(/name:\s*ROUTE_NAME\.([A-Z0-9_]+)/)
    routes.push({
      name: nameMatch?.[1]?.toLowerCase().replace(/_/g, '-') ?? routePath,
      path: expandRoutePath(routePath),
    })
  }

  return routes
}

export const getLayoutRoutes = (rootDir = process.cwd()): RouteCase[] => {
  const routeFile = path.join(rootDir, 'frontend/src/router/routes.ts')
  return parseLayoutRoutes(fs.readFileSync(routeFile, 'utf8'))
}

export const filterRoutes = (selectedPaths: string[] | undefined): RouteCase[] => {
  const allRoutes = getLayoutRoutes()
  if (!selectedPaths?.length) return allRoutes

  const selected = new Set(selectedPaths)
  return allRoutes.filter(route => selected.has(route.path) || selected.has(route.name))
}
