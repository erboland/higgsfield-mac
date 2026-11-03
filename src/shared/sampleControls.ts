import { BASE_MODEL_ID, OPEN_MODEL_ID, SDXL_MODEL_ID } from './studioModels.ts'

export const SAMPLERS = ['euler', 'euler_ancestral', 'dpmpp_2m', 'dpmpp_2m_sde'] as const
export const SCHEDULERS = ['normal', 'karras', 'simple', 'sgm_uniform'] as const

export type SamplerName = (typeof SAMPLERS)[number]
export type SchedulerName = (typeof SCHEDULERS)[number]
export type SampleFamily = 'sd' | 'sd-turbo' | 'sdxl-base' | 'sdxl-turbo'

export type SampleSettings = {
  sampler: SamplerName
  scheduler: SchedulerName
  steps: number
  cfg: number
  seed: number
}

const GENERIC: SampleSettings = { sampler: 'euler', scheduler: 'normal', steps: 20, cfg: 8, seed: 0 }
const TURBO: SampleSettings = { sampler: 'euler', scheduler: 'normal', steps: 1, cfg: 0, seed: 0 }

export function familyForModel(modelId: string): SampleFamily {
  if (modelId === BASE_MODEL_ID) return 'sdxl-base'
  if (modelId === SDXL_MODEL_ID) return 'sdxl-turbo'
  if (modelId === OPEN_MODEL_ID) return 'sd-turbo'
  const name = modelId.toLowerCase()
  const turbo = name.includes('turbo')
  const xl = name.includes('xl')
  if (turbo && xl) return 'sdxl-turbo'
  if (xl) return 'sdxl-base'
  if (turbo) return 'sd-turbo'
  return 'sd'
}

export function sampleDefaults(modelId: string): SampleSettings {
  const family = familyForModel(modelId)
  if (family === 'sd-turbo' || family === 'sdxl-turbo') return { ...TURBO }
  return { ...GENERIC }
}
