/** Open checkpoints this app can download. Hosted Higgsfield models are not in this list. */
export const OPEN_MODELS = [
  {
    id: 'runwayml/stable-diffusion-v1-5',
    name: 'Stable Diffusion 1.5',
    summary: 'Stronger open checkpoint for image and video prompts. CreativeML OpenRAIL-M.',
  },
  {
    id: 'nota-ai/bk-sdm-tiny',
    name: 'BK-SDM Tiny',
    summary: 'Small distilled checkpoint. Faster, and less detailed than Stable Diffusion 1.5.',
  },
] as const

export const DEFAULT_LOCAL_MODEL_ID = OPEN_MODELS[0].id

/** Names only. These weights are not public, so the library cannot download them. */
export const HOSTED_WITHOUT_WEIGHTS = [
  { id: 'text2image_soul_v2', name: 'Higgsfield Soul' },
  { id: 'soul_cinematic', name: 'Soul Cinematic' },
  { id: 'soul_location', name: 'Soul Location' },
  { id: 'kling3_0', name: 'Kling' },
  { id: 'kling_omni_image', name: 'Kling O1 Image' },
  { id: 'veo3_1', name: 'Google Veo' },
  { id: 'seedance_2_0', name: 'Seedance' },
  { id: 'wan2_6', name: 'Wan' },
] as const

export function openModel(id: string) {
  return OPEN_MODELS.find((model) => model.id === id) ?? null
}
