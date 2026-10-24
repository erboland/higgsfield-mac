import { OPEN_MODEL_ID, type StudioKind } from './studioModels.ts'

export type StudioAspect = '1:1' | '16:9' | '9:16' | '4:3' | '3:4'

export const STUDIO_ASPECTS: StudioAspect[] = ['1:1', '16:9', '9:16', '4:3', '3:4']

export type StudioTemplate = {
  id: string
  title: string
  blurb: string
  prompt: string
  kind: StudioKind
  group: string
  aspect: StudioAspect
  runnable: boolean
}

/** Public studio presets from higgsfield-ai/app-templates. They run on the selected checkpoint. */
export const LOCAL_TEMPLATES: StudioTemplate[] = [
  {
    id: 'editorial-still',
    title: 'Editorial still',
    group: 'Text to Image',
    kind: 'image',
    aspect: '3:4',
    runnable: true,
    blurb: 'Magazine-grade key visual. Local still from the open checkpoint.',
    prompt: 'Editorial fashion still, 85mm, shallow depth of field, muted palette, single hard light from the left.',
  },
  {
    id: 'lifestyle-home',
    title: 'Lifestyle at home',
    group: 'Text to Image',
    kind: 'image',
    aspect: '4:3',
    runnable: true,
    blurb: 'Warm lamp light and a candid frame.',
    prompt: 'Warm lifestyle photo of a couple at home in the evening, lamp light, film grain, candid moment.',
  },
  {
    id: 'product-hero',
    title: 'Product hero shot',
    group: 'Text to Video',
    kind: 'video',
    aspect: '16:9',
    runnable: true,
    blurb: 'Two stills from the selected checkpoint, saved as a short MP4. Not Seedance or Kling.',
    prompt: 'Cinematic product hero shot on a dark studio backdrop, slow orbit, soft rim light, dust particles catching the light.',
  },
  {
    id: 'ugc-review',
    title: 'UGC review',
    group: 'Text to Video',
    kind: 'video',
    aspect: '9:16',
    runnable: true,
    blurb: 'Handheld look, encoded locally. Not a hosted video model.',
    prompt: 'Handheld creator-style review filmed on a phone in a sunny kitchen, natural light, casual framing, subtle camera shake.',
  },
]

export const HOSTED_TEMPLATES: StudioTemplate[] = [
  {
    id: 'soul',
    title: 'Higgsfield Soul',
    group: 'Hosted',
    kind: 'image',
    aspect: '1:1',
    runnable: false,
    blurb: 'On higgsfield.ai. No public weights.',
    prompt: '',
  },
  {
    id: 'kling',
    title: 'Kling 4.0',
    group: 'Hosted',
    kind: 'video',
    aspect: '16:9',
    runnable: false,
    blurb: 'On higgsfield.ai. No public weights.',
    prompt: '',
  },
  {
    id: 'genjutsu',
    title: 'Genjutsu',
    group: 'Hosted',
    kind: 'video',
    aspect: '16:9',
    runnable: false,
    blurb: 'On higgsfield.ai. No public weights.',
    prompt: '',
  },
  {
    id: 'seedance',
    title: 'Seedance 2.5',
    group: 'Hosted',
    kind: 'video',
    aspect: '16:9',
    runnable: false,
    blurb: 'On higgsfield.ai. No public weights.',
    prompt: '',
  },
  {
    id: 'veo',
    title: 'Veo 3.1',
    group: 'Hosted',
    kind: 'video',
    aspect: '16:9',
    runnable: false,
    blurb: 'On higgsfield.ai. No public weights.',
    prompt: '',
  },
  {
    id: 'angles',
    title: 'Angles',
    group: 'Hosted',
    kind: 'image',
    aspect: '1:1',
    runnable: false,
    blurb: 'Hosted app. No public weights.',
    prompt: '',
  },
]

export const OPEN_TEMPLATE_MODEL = OPEN_MODEL_ID

export function templateById(id: string): StudioTemplate | undefined {
  return [...LOCAL_TEMPLATES, ...HOSTED_TEMPLATES].find((entry) => entry.id === id)
}
