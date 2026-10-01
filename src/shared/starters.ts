import type { JobDraft, SkillId } from './types.ts'

export type PromptKind = 'image' | 'video' | 'audio' | '3d' | 'product'

export type PromptEntry = {
  id: string
  title: string
  prompt: string
  kind: PromptKind
  modelId: string
  skillId: SkillId
  photoshootMode?: string
  marketplaceScope?: string
}

export type TemplateCategory = 'image' | 'video' | 'product' | 'identity' | 'audio' | 'sites' | '3d'

export type TemplateEntry = {
  id: string
  title: string
  blurb: string
  category: TemplateCategory
  skillId: SkillId
  patch: Partial<JobDraft>
  /** Prompt used for the gallery demo when the job itself has no prompt. */
  demoPrompt?: string
}

export const promptKinds: PromptKind[] = ['image', 'video', 'product', 'audio', '3d']

export const prompts: PromptEntry[] = [
  {
    id: 'late-kitchen',
    title: 'Late kitchen light',
    prompt: 'A small kitchen after dinner, one lamp still on, steam over a mug, 35mm, quiet color.',
    kind: 'image',
    modelId: 'gpt_image_2_5',
    skillId: 'higgsfield-generate',
  },
  {
    id: 'window-portrait',
    title: 'Window portrait',
    prompt: 'Portrait at a tall window, overcast light, linen shirt, no jewelry, editorial crop.',
    kind: 'image',
    modelId: 'text2image_soul_v2',
    skillId: 'higgsfield-generate',
  },
  {
    id: 'ferry-mark',
    title: 'Ferry wordmark',
    prompt: 'A simple wordmark for a coastal ferry, two colors, geometric, lots of clear space.',
    kind: 'image',
    modelId: 'recraft_v4_1',
    skillId: 'higgsfield-brandkit',
  },
  {
    id: 'thumbnail-laugh',
    title: 'Title-ready still',
    prompt: 'Close crop of a person mid-laugh, high contrast, open space on the left for a short title.',
    kind: 'image',
    modelId: 'nano_banana_2',
    skillId: 'higgsfield-youtube-thumbnail',
  },
  {
    id: 'valley-light',
    title: 'Valley at first light',
    prompt: 'A slow aerial over a dry valley as the sun clears the ridge, no people.',
    kind: 'video',
    modelId: 'seedance_2_5',
    skillId: 'higgsfield-generate',
  },
  {
    id: 'rain-platform',
    title: 'Rain on the platform',
    prompt: 'A train platform in light rain. One person with a red umbrella walks away from camera.',
    kind: 'video',
    modelId: 'kling3_0',
    skillId: 'higgsfield-generate',
  },
  {
    id: 'neon-street',
    title: 'Street after rain',
    prompt: 'Night street after rain, neon in the puddles, camera at hip height, one continuous move.',
    kind: 'video',
    modelId: 'cinematic_studio_video_v2',
    skillId: 'higgsfield-generate',
  },
  {
    id: 'counter-bottle',
    title: 'Bottle on the counter',
    prompt: 'Amber glass bottle on pale oak, morning side light, a single leaf beside it.',
    kind: 'product',
    modelId: '',
    skillId: 'higgsfield-product-photoshoot',
    photoshootMode: 'lifestyle',
  },
  {
    id: 'listing-kettle',
    title: 'Listing still',
    prompt: 'Matte black kettle on white, front three-quarter, room above it for a headline.',
    kind: 'product',
    modelId: '',
    skillId: 'higgsfield-marketplace-cards',
    marketplaceScope: 'listing',
  },
  {
    id: 'tin-roof',
    title: 'Tin roof rain',
    prompt: 'Steady rain on a tin roof, distant thunder once, no music.',
    kind: 'audio',
    modelId: 'seed_audio',
    skillId: 'higgsfield-generate',
  },
  {
    id: 'seed-to-tree',
    title: 'Four quiet sentences',
    prompt: 'Narration, calm pace: how a seed becomes a tree. Four short sentences. No music.',
    kind: 'audio',
    modelId: 'seed_audio',
    skillId: 'higgsfield-video-explainer',
  },
  {
    id: 'clay-fox',
    title: 'Clay fox',
    prompt: 'A small clay fox, studio gray, even light, ready for a turntable capture.',
    kind: '3d',
    modelId: 'image_auto_3d',
    skillId: 'higgsfield-generate',
  },
]

export const templateCategories: Array<{ id: TemplateCategory | 'all'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'image', label: 'Image' },
  { id: 'video', label: 'Video' },
  { id: 'product', label: 'Product' },
  { id: 'identity', label: 'Identity' },
  { id: 'audio', label: 'Audio' },
  { id: 'sites', label: 'Sites' },
  { id: '3d', label: '3D' },
]

export const templates: TemplateEntry[] = [
  {
    id: 'still',
    title: 'Still image',
    blurb: 'A single frame from the Generate skill. Swap the model after it opens.',
    category: 'image',
    skillId: 'higgsfield-generate',
    patch: { modelId: 'gpt_image_2_5', prompt: 'Morning light across an empty table, one cup, no text.' },
  },
  {
    id: 'soul-portrait',
    title: 'Soul portrait',
    blurb: 'Soul V2 still. Add a trained reference id in the prompt when you have one.',
    category: 'identity',
    skillId: 'higgsfield-generate',
    patch: { modelId: 'text2image_soul_v2', prompt: 'Three-quarter portrait, soft window light, plain wall.' },
  },
  {
    id: 'cinema-clip',
    title: 'Cinema clip',
    blurb: 'Seedance 2.5, five seconds, a single camera move.',
    category: 'video',
    skillId: 'higgsfield-generate',
    patch: { modelId: 'seedance_2_5', prompt: 'A slow push through a pine forest at dusk, no people.' },
  },
  {
    id: 'marketing-spot',
    title: 'Product spot',
    blurb: 'Marketing Studio video ad from a product still you already have.',
    category: 'video',
    skillId: 'higgsfield-generate',
    patch: { modelId: 'marketing_studio_video', prompt: 'A short product spot, the object turns once, clean background.' },
  },
  {
    id: 'lifestyle-set',
    title: 'Lifestyle set',
    blurb: 'Product photoshoot in lifestyle mode. The CLI enhances the brief.',
    category: 'product',
    skillId: 'higgsfield-product-photoshoot',
    patch: { photoshootMode: 'lifestyle', prompt: 'Ceramic pour-over on a linen cloth, north light.' },
  },
  {
    id: 'packshot',
    title: 'Packshot',
    blurb: 'Studio packshot mode for a clean product frame.',
    category: 'product',
    skillId: 'higgsfield-product-photoshoot',
    patch: { photoshootMode: 'studio', prompt: 'White bottle, centered, soft shadow, no label text.' },
  },
  {
    id: 'listing',
    title: 'Marketplace listing',
    blurb: 'Main image, extras, and listing modules from one product brief.',
    category: 'product',
    skillId: 'higgsfield-marketplace-cards',
    patch: { marketplaceScope: 'listing', prompt: 'Stoneware mug, front view, white ground, space for a title.' },
  },
  {
    id: 'soul-train',
    title: 'Train a character',
    blurb: 'Soul ID from a folder of photos. The reference is what later stills reuse.',
    category: 'identity',
    skillId: 'higgsfield-soul-id',
    patch: { characterName: 'Avery' },
    demoPrompt: 'Three-quarter portrait of one person, soft window light, plain wall, no text.',
  },
  {
    id: 'brand-mark',
    title: 'Brand mark',
    blurb: 'First step of a brand kit: a Recraft logo mark.',
    category: 'image',
    skillId: 'higgsfield-brandkit',
    patch: { prompt: 'A compact mark for a night bakery, one shape, two colors.' },
  },
  {
    id: 'narration',
    title: 'Explainer narration',
    blurb: 'The first runnable block of an explainer: spoken audio, then pictures.',
    category: 'audio',
    skillId: 'higgsfield-video-explainer',
    patch: { prompt: 'Explain how a lock works, in five short spoken lines, calm voice.' },
  },
  {
    id: 'thumbnail',
    title: 'Thumbnail',
    blurb: 'A 16:9 still with room for a title, from the thumbnail skill.',
    category: 'image',
    skillId: 'higgsfield-youtube-thumbnail',
    patch: { prompt: 'A person looking just past camera, bright background, empty left third.', aspectRatio: '16:9' },
  },
  {
    id: 'site',
    title: 'Website',
    blurb: 'Create a hosted site. The platform provisions the repo.',
    category: 'sites',
    skillId: 'higgsfield-websites',
    patch: { websiteType: 'website', websiteCategory: 'portfolio' },
    demoPrompt: 'A portfolio website on a laptop screen, quiet desk, morning light, no readable words.',
  },
  {
    id: 'app-shell',
    title: 'App shell',
    blurb: 'An app starter. Pick the template after it opens in Create.',
    category: 'sites',
    skillId: 'higgsfield-websites',
    patch: { websiteType: 'app', websiteCategory: 'productivity', websiteTemplate: 'nextjs' },
    demoPrompt: 'A simple productivity app on a laptop, pale screen, morning light, no readable words.',
  },
  {
    id: 'turntable',
    title: 'Object to 3D',
    blurb: 'One product photo in, a mesh job out. Point the image path at a local file.',
    category: '3d',
    skillId: 'higgsfield-generate',
    patch: { modelId: 'image_auto_3d', prompt: '' },
    demoPrompt: 'A small clay fox centered on a gray studio turntable, even light.',
  },
]
