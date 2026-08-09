import fs from 'node:fs'
import path from 'node:path'
import { fixtureDir } from './config'
import type { FixtureName, FixturePayload } from './types'

const fixtureNamePattern = /^[A-Za-z0-9_-]+$/

export const getFixturePath = (rootDir: string, name: FixtureName) => (
  path.join(rootDir, fixtureDir, `${name}.json`)
)

export const getFixtureNames = (rootDir: string): FixtureName[] => {
  const dir = path.join(rootDir, fixtureDir)
  if (!fs.existsSync(dir)) {
    throw new Error(`Missing layout fixture directory: ${dir}`)
  }

  const names = fs.readdirSync(dir)
    .filter(fileName => fileName.endsWith('.json'))
    .map(fileName => path.basename(fileName, '.json'))
    .filter(name => fixtureNamePattern.test(name))
    .sort()

  if (names.length === 0) {
    throw new Error(`No layout fixture JSON files found in ${dir}`)
  }

  return names
}

export const readFixture = (rootDir: string, name: FixtureName): FixturePayload => {
  const filePath = getFixturePath(rootDir, name)
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing layout fixture JSON: ${filePath}`)
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as FixturePayload
}

export const validateFixturePayload = (name: FixtureName, payload: FixturePayload) => {
  const errors: string[] = []
  const modules = (payload as FixturePayload & { module?: unknown }).modules ?? (payload as FixturePayload & { module?: unknown }).module

  if ('deviceRecord' in payload && payload.deviceRecord !== null && typeof payload.deviceRecord !== 'object') {
    errors.push('deviceRecord must be an object or null')
  }

  if (modules !== undefined && modules !== null && !Array.isArray(modules)) {
    errors.push('module/modules must be an array, null, or omitted')
  }

  if (payload.print !== undefined && payload.print !== null) {
    if (typeof payload.print !== 'object') {
      errors.push('print must be an object, null, or omitted')
    } else {
      const print = payload.print as Record<string, unknown>
      const missing = ['gcode_state', 'ams', 'vt_tray', 'hms', 'print_error', 'task_id', 'subtask_id']
        .filter(key => !(key in print))
      if (missing.length > 0) {
        errors.push(`print is missing required field(s): ${missing.join(', ')}`)
      }
      if ('hms' in print && !Array.isArray(print.hms)) {
        errors.push('print.hms must be an array')
      }
      const ams = print.ams as { ams?: unknown } | undefined
      if (ams && !Array.isArray(ams.ams)) {
        errors.push('print.ams.ams must be an array')
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invalid layout fixture ${name}:\n${errors.map(error => `- ${error}`).join('\n')}`)
  }
}

export const validateFixtureFiles = (rootDir: string, names: FixtureName[]) => {
  const missing = names
    .map(name => getFixturePath(rootDir, name))
    .filter(filePath => !fs.existsSync(filePath))

  if (missing.length > 0) {
    throw new Error([
      'Missing layout fixture JSON files:',
      ...missing.map(filePath => `- ${filePath}`),
      'Provide these files before running layout test tests.',
    ].join('\n'))
  }

  for (const name of names) {
    validateFixturePayload(name, readFixture(rootDir, name))
  }
}
