import type { DevicePrint, Module, Project } from '@bambulab-p1screen/printer-api'
import type { DeviceRecord } from '../utils/device'

export type ChromeLayoutDiffFixtureName = string

export type ChromeLayoutDiffFixture = {
  name: ChromeLayoutDiffFixtureName
  deviceRecord: DeviceRecord | null
  print: DevicePrint | undefined
  modules: Module[] | undefined
  project: Project | null
}

export type ChromeLayoutDiffFixturePayload = Partial<Omit<ChromeLayoutDiffFixture, 'name'>> & {
  name?: string
  module?: Module[]
}

declare global {
  interface Window {
    __P1SCREEN_CHROME_LAYOUT_DIFF_FIXTURE__?: ChromeLayoutDiffFixtureName
    __P1SCREEN_CHROME_LAYOUT_DIFF_FIXTURE_DATA__?: ChromeLayoutDiffFixturePayload
  }
}
