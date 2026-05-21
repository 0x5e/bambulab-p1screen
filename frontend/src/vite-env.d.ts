/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly APP_VERSION: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module 'semver/functions/gt' {
  const gt: (version: string, otherVersion: string, loose?: boolean) => boolean
  export default gt
}
