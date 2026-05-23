import { fixtureRoutes, ignoreSelectors } from './config'
import type { ChromeTargetId, FixtureName, LayoutCase, RouteCase, Viewport } from './types'

const routesForFixture = (
  routes: RouteCase[],
  fixture: FixtureName,
) => {
  const configuredRoutes = fixtureRoutes[fixture]
  if (!configuredRoutes?.length) return routes

  const routeSet = new Set(configuredRoutes)
  return routes.filter(route => routeSet.has(route.path) || routeSet.has(route.name))
}

export const buildMatrix = (
  targets: ChromeTargetId[],
  routes: RouteCase[],
  selectedViewports: Viewport[],
  selectedFixtures: FixtureName[],
): LayoutCase[] => {
  const cases: LayoutCase[] = []
  for (const target of targets) {
    for (const viewport of selectedViewports) {
      for (const fixture of selectedFixtures) {
        for (const route of routesForFixture(routes, fixture)) {
          cases.push({ target, viewport, route, fixture, ignoreSelectors })
        }
      }
    }
  }
  return cases
}
