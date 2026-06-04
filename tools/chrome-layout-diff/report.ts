import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const thisDir = path.dirname(fileURLToPath(import.meta.url))
const templatePath = path.join(thisDir, 'report-template.html')

/** Read the JSON results file and embed it into the HTML, then write to outputPath. */
export const writeReport = (outputPath: string) => {
  const resultsPath = path.join(path.dirname(outputPath), 'chrome-layout-diff-results.json')
  const template = fs.readFileSync(templatePath, 'utf-8')
  let html: string
  if (fs.existsSync(resultsPath)) {
    const resultsJson = fs.readFileSync(resultsPath, 'utf-8')
    html = template.replace(
      '<script>',
      '<script>window.__RESULTS__ = ' + resultsJson + ';\n'
    )
  } else {
    html = template
  }
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, html)
}
