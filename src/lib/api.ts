import type { HiggsfieldApi } from '../shared/types.ts'
import { createBrowserBridge } from '../preview/browserBridge.ts'

export function getApi(): HiggsfieldApi {
  return window.higgsfield ?? createBrowserBridge()
}
