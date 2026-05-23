import { layoutTolerancePx } from './config'
import type { DomSnapshot, ElementSnapshot, LayoutDifference } from './types'

const rectMetrics = ['x', 'y', 'width', 'height', 'top', 'right', 'bottom', 'left'] as const
const boxMetrics = ['clientWidth', 'clientHeight', 'scrollWidth', 'scrollHeight', 'offsetWidth', 'offsetHeight'] as const

const byPath = (snapshot: DomSnapshot) => new Map(snapshot.elements.map(element => [element.path, element]))

const compareNumber = (
  path: string,
  type: LayoutDifference['type'],
  metric: string,
  expected: number,
  actual: number,
  tolerance: number,
): LayoutDifference | null => {
  const delta = Math.abs(actual - expected)
  if (delta <= tolerance) return null
  return { path, type, metric, expected, actual, delta }
}

const compareElement = (
  expected: ElementSnapshot,
  actual: ElementSnapshot,
  tolerance: number,
): LayoutDifference[] => {
  const differences: LayoutDifference[] = []

  if (expected.textHash !== actual.textHash) {
    differences.push({
      path: expected.path,
      type: 'text',
      metric: 'textHash',
      expected: expected.textHash,
      actual: actual.textHash,
    })
  }

  for (const metric of rectMetrics) {
    const diff = compareNumber(
      expected.path,
      'rect',
      metric,
      expected.appRect[metric],
      actual.appRect[metric],
      tolerance,
    )
    if (diff) differences.push(diff)
  }

  for (const metric of boxMetrics) {
    const diff = compareNumber(
      expected.path,
      'box',
      metric,
      expected[metric],
      actual[metric],
      tolerance,
    )
    if (diff) differences.push(diff)
  }

  for (const [metric, expectedValue] of Object.entries(expected.styles)) {
    const actualValue = actual.styles[metric]
    if (expectedValue !== actualValue) {
      differences.push({
        path: expected.path,
        type: 'style',
        metric,
        expected: expectedValue,
        actual: actualValue,
      })
    }
  }

  return differences
}

export const diffSnapshots = (
  expected: DomSnapshot,
  actual: DomSnapshot,
  tolerance = layoutTolerancePx,
): LayoutDifference[] => {
  const expectedByPath = byPath(expected)
  const actualByPath = byPath(actual)
  const differences: LayoutDifference[] = []

  for (const [path, expectedElement] of expectedByPath.entries()) {
    const actualElement = actualByPath.get(path)
    if (!actualElement) {
      differences.push({ path, type: 'missing' })
      continue
    }

    differences.push(...compareElement(expectedElement, actualElement, tolerance))
  }

  for (const path of actualByPath.keys()) {
    if (!expectedByPath.has(path)) {
      differences.push({ path, type: 'added' })
    }
  }

  return differences
}
