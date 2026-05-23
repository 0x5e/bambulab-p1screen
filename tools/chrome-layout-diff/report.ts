import fs from 'node:fs'
import path from 'node:path'
import { viewportId } from './config'
import type { CaseResult } from './types'

const escapeHtml = (value: unknown) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')

const screenshotPathFromSnapshotPath = (snapshotPath: string | undefined) => (
  snapshotPath?.replace('/snapshots/', '/screenshots/').replace(/\.json$/, '.png')
)

const imageSrc = (outputPath: string, imagePath: string | undefined) => {
  if (!imagePath) return ''
  return path.relative(path.dirname(outputPath), imagePath).split('/').map(encodeURIComponent).join('/')
}

const screenshotCell = (outputPath: string, imagePath: string | undefined, label: string) => {
  const src = imageSrc(outputPath, imagePath)
  if (!src) return ''
  return `<a href="${escapeHtml(src)}"><img class="screenshot" src="${escapeHtml(src)}" alt="${escapeHtml(label)}" loading="lazy"></a>`
}

const filterOptions = (values: string[]) => (
  Array.from(new Set(values)).sort((left, right) => left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' }))
)

const selectFilter = (column: number, label: string, values: string[]) => (
  `<select data-filter-column="${column}" aria-label="${escapeHtml(label)}">
    <option value="">All</option>
    ${filterOptions(values).map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('\n')}
  </select>`
)

export const writeReport = (outputPath: string, results: CaseResult[]) => {
  const failed = results.filter(result => !result.passed)
  const chromeOptions = results.map(result => result.target)
  const viewportOptions = results.map(result => viewportId(result.viewport))
  const routeOptions = results.map(result => result.route.path)
  const fixtureOptions = results.map(result => result.fixture)
  const statusOptions = results.map(result => (result.passed ? 'PASS' : 'FAIL'))
  const rows = results.map(result => {
    const topDiffs = result.differences.slice(0, 5).map(diff => (
      `<div><code>${escapeHtml(diff.path)}</code> ${escapeHtml(diff.metric ?? diff.type)} ${escapeHtml(diff.expected ?? '')} -> ${escapeHtml(diff.actual ?? '')}${diff.delta === undefined ? '' : ` (${diff.delta.toFixed(3)})`}</div>`
    )).join('')
    const baselineScreenshotPath = result.baselineScreenshotPath ?? screenshotPathFromSnapshotPath(result.baselinePath)

    return `
      <tr class="${result.passed ? 'pass' : 'fail'}">
        <td>${escapeHtml(result.target)}</td>
        <td>${escapeHtml(viewportId(result.viewport))}</td>
        <td>${escapeHtml(result.route.path)}</td>
        <td>${escapeHtml(result.fixture)}</td>
        <td>${result.passed ? 'PASS' : 'FAIL'}</td>
        <td>${result.differences.length}</td>
        <td>${topDiffs}</td>
        <td>${result.passed ? '' : screenshotCell(outputPath, result.screenshotPath, `${result.target} screenshot`)}</td>
        <td>${result.passed ? '' : screenshotCell(outputPath, baselineScreenshotPath, `${result.baselineTarget} baseline screenshot`)}</td>
      </tr>
    `
  }).join('\n')

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Layout Test Report</title>
    <style>
      :root {
        color-scheme: light dark;
        --page-bg: #ffffff;
        --text: #1f2937;
        --table-border: #d1d5db;
        --header-bg: #f3f4f6;
        --pass-bg: #f0fdf4;
        --fail-bg: #fef2f2;
        --code-bg: #f3f4f6;
        --code-text: #111827;
        --screenshot-bg: #ffffff;
      }

      @media (prefers-color-scheme: dark) {
        :root {
          --page-bg: #111827;
          --text: #e5e7eb;
          --table-border: #374151;
          --header-bg: #1f2937;
          --pass-bg: #123524;
          --fail-bg: #3f1d1d;
          --code-bg: #0f172a;
          --code-text: #f9fafb;
          --screenshot-bg: #111827;
        }
      }

      body { background: var(--page-bg); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 24px; color: var(--text); }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid var(--table-border); padding: 8px; vertical-align: top; font-size: 12px; }
      th { background: var(--header-bg); text-align: left; }
      select { box-sizing: border-box; width: 100%; background: var(--page-bg); border: 1px solid var(--table-border); color: var(--text); font: inherit; padding: 4px 6px; }
      tr.fail { background: var(--fail-bg); }
      tr.pass { background: var(--pass-bg); }
      code { background: var(--code-bg); color: var(--code-text); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
      .screenshot { background: var(--screenshot-bg); border: 1px solid var(--table-border); display: block; max-height: 240px; max-width: 180px; object-fit: contain; }
    </style>
  </head>
  <body>
    <h1>Layout Test Report</h1>
    <p>${results.length} comparisons, ${failed.length} failed.</p>
    <table>
      <thead>
        <tr>
          <th>Chrome</th>
          <th>Viewport</th>
          <th>Route</th>
          <th>Fixture</th>
          <th>Status</th>
          <th>Diffs</th>
          <th>Top differences</th>
          <th>Current screenshot</th>
          <th>Baseline screenshot</th>
        </tr>
        <tr>
          <th>${selectFilter(0, 'Filter Chrome', chromeOptions)}</th>
          <th>${selectFilter(1, 'Filter Viewport', viewportOptions)}</th>
          <th>${selectFilter(2, 'Filter Route', routeOptions)}</th>
          <th>${selectFilter(3, 'Filter Fixture', fixtureOptions)}</th>
          <th>${selectFilter(4, 'Filter Status', statusOptions)}</th>
          <th></th>
          <th></th>
          <th></th>
          <th></th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <script>
      const filters = Array.from(document.querySelectorAll('[data-filter-column]'));
      const rows = Array.from(document.querySelectorAll('tbody tr'));

      const applyFilters = () => {
        const activeFilters = filters.map(filter => ({
          column: Number(filter.dataset.filterColumn),
          value: filter.value.trim().toLowerCase(),
        })).filter(filter => filter.value);

        rows.forEach(row => {
          const matches = activeFilters.every(filter => (
            row.children[filter.column].textContent.trim().toLowerCase() === filter.value
          ));
          row.hidden = !matches;
        });
      };

      filters.forEach(filter => filter.addEventListener('change', applyFilters));
    </script>
  </body>
</html>`

  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, html)
}
