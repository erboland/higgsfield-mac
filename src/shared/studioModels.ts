export const OPEN_MODEL_ID = 'stabilityai/sd-turbo'
export const OPEN_MODEL_NAME = 'SD Turbo'
export const SDXL_MODEL_ID = 'stabilityai/sdxl-turbo'
export const SDXL_MODEL_NAME = 'SDXL Turbo'
export const SDXL_FILENAME = 'sd_xl_turbo_1.0_fp16.safetensors'
export const BASE_MODEL_ID = 'stabilityai/stable-diffusion-xl-base-1.0'
export const BASE_MODEL_NAME = 'SDXL Base'
export const BASE_FILENAME = 'sd_xl_base_1.0.safetensors'
export const OPEN_MODEL_NOTE =
  'SDXL Base is the full checkpoint. SDXL Turbo is a distilled one-step model. Not Soul, Kling, Veo, or Seedance.'

export type OpenCheckpoint = {
  id: string
  name: string
  folder: (typeof MODEL_FOLDERS)[number]
  filename: string
  note: string
}

export type StudioKind = 'image' | 'video'

/** Folder names REA recovered from Comfy Desktop `models.ts`. */
export const MODEL_FOLDERS = [
  'checkpoints',
  'diffusion_models',
  'text_encoders',
  'vae',
  'clip',
  'unet',
  'loras',
  'embeddings',
  'controlnet',
] as const

export const OPEN_CHECKPOINTS: OpenCheckpoint[] = [
  {
    id: OPEN_MODEL_ID,
    name: OPEN_MODEL_NAME,
    folder: 'checkpoints',
    filename: 'sd_turbo.safetensors',
    note: 'Open SD Turbo checkpoint. Two-step stills.',
  },
  {
    id: BASE_MODEL_ID,
    name: BASE_MODEL_NAME,
    folder: 'checkpoints',
    filename: BASE_FILENAME,
    note: 'Full SDXL checkpoint. Twenty steps, guidance 5. Not a turbo distillation.',
  },
  {
    id: SDXL_MODEL_ID,
    name: SDXL_MODEL_NAME,
    folder: 'checkpoints',
    filename: SDXL_FILENAME,
    note: 'Distilled one-step model. Faster than SDXL Base, and not the quality checkpoint.',
  },
]

export type LibraryFile = {
  id: string
  folder: string
  filename: string
  bytes: number
}

export type LibraryModel = {
  id: string
  name: string
  folder: string
  filename: string
  installed: boolean
  runnable: boolean
  note: string
}

export type LibraryReport = {
  root: string
  folders: { name: string; files: LibraryFile[] }[]
  models: LibraryModel[]
}

export type HostedModel = {
  id: string
  name: string
  kind: StudioKind
  note: string
}

/** Names advertised on higgsfield.ai. No public weights are bundled or downloaded. */
export const HOSTED_MODELS: HostedModel[] = [
  { id: 'text2image_soul_v2', name: 'Higgsfield Soul', kind: 'image', note: 'Hosted. No public weights.' },
  { id: 'soul_cinematic', name: 'Soul Cinematic', kind: 'image', note: 'Hosted. No public weights.' },
  { id: 'soul_location', name: 'Soul Location', kind: 'image', note: 'Hosted. No public weights.' },
  { id: 'kling3_0', name: 'Kling 3.0', kind: 'video', note: 'API catalog id. No public weights.' },
  { id: 'kling4_0', name: 'Kling 4.0', kind: 'video', note: 'Hosted on higgsfield.ai. No public weights.' },
  { id: 'kling_omni_image', name: 'Kling O1 Image', kind: 'image', note: 'Hosted. No public weights.' },
  { id: 'genjutsu', name: 'Higgsfield Genjutsu', kind: 'video', note: 'Hosted. No public weights.' },
  { id: 'genjutsu_lite', name: 'Genjutsu Lite', kind: 'video', note: 'Hosted. No public weights.' },
  { id: 'veo3_1', name: 'Veo 3.1', kind: 'video', note: 'Hosted. No public weights.' },
  { id: 'seedance_2_0', name: 'Seedance 2.0', kind: 'video', note: 'API catalog id. No public weights.' },
  { id: 'seedance_2_5', name: 'Seedance 2.5', kind: 'video', note: 'Hosted. No public weights.' },
  { id: 'sora_2', name: 'Sora 2', kind: 'video', note: 'Hosted. No public weights.' },
  { id: 'wan2_6', name: 'Wan 2.6', kind: 'video', note: 'Hosted. No public weights.' },
]

const HOSTED_IDS = new Set(HOSTED_MODELS.map((model) => model.id))

export function isHostedModel(id: string): boolean {
  return HOSTED_IDS.has(id)
}

/** Folders a still can load as the base checkpoint. */
export const CHECKPOINT_FOLDERS = ['checkpoints', 'diffusion_models'] as const

export type AddonFolder = 'loras' | 'vae' | 'embeddings'

const CHECKPOINT_FILE = /^file:(checkpoints|diffusion_models)\/[^/]+\.(safetensors|ckpt)$/i
const ADDON_FILE: Record<AddonFolder, RegExp> = {
  loras: /^file:loras\/[^/]+\.(safetensors|ckpt)$/i,
  vae: /^file:vae\/[^/]+\.(safetensors|ckpt)$/i,
  embeddings: /^file:embeddings\/[^/]+\.(safetensors|pt|bin)$/i,
}

export function canDownloadModel(id: string): boolean {
  return OPEN_CHECKPOINTS.some((model) => model.id === id)
}

export function canRunModel(id: string): boolean {
  return canDownloadModel(id) || CHECKPOINT_FILE.test(id)
}

export function canAttach(id: string, folder: AddonFolder): boolean {
  return ADDON_FILE[folder].test(id)
}

export function modelChoiceLabel(id: string): string {
  const known = OPEN_CHECKPOINTS.find((model) => model.id === id)
  if (known) return known.name
  const hosted = HOSTED_MODELS.find((model) => model.id === id)
  if (hosted) return hosted.name
  const slash = id.lastIndexOf('/')
  return slash >= 0 ? id.slice(slash + 1) : id
}
