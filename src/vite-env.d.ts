/// <reference types="vite/client" />

import type { HiggsfieldApi } from './shared/types.ts'

declare global {
  interface Window {
    higgsfield?: HiggsfieldApi
  }
}

export {}
