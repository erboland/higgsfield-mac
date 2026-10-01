import type { ModelEntry, PhotoshootMode, SkillEntry } from './types.ts'

/**
 * Interface names from the MIT-licensed Higgsfield CLI documentation.
 * Copyright (c) 2026 Higgsfield AI. Display names are reproduced as factual
 * identifiers; MODELS.md parameter prose is not copied. See NOTICES.md.
 */
export const models: ModelEntry[] = [
  { id: 'nano_banana_2', name: 'Nano Banana Pro', modality: 'image', prompt: 'required' },
  { id: 'nano_banana_2_lite', name: 'Nano Banana 2 Lite', modality: 'image', prompt: 'required' },
  { id: 'nano_banana_flash', name: 'Nano Banana 2', modality: 'image', prompt: 'required' },
  { id: 'nano_banana', name: 'Nano Banana', modality: 'image', prompt: 'required' },
  { id: 'flux_2', name: 'FLUX.2', modality: 'image', prompt: 'required' },
  { id: 'flux_kontext', name: 'Flux Kontext', modality: 'image', prompt: 'required' },
  { id: 'gpt_image_2', name: 'GPT Image 2', modality: 'image', prompt: 'required' },
  { id: 'gpt_image_2_5', name: 'GPT Image 2.5', modality: 'image', prompt: 'required' },
  { id: 'text2image_soul_v2', name: 'Higgsfield Soul V2', modality: 'image', prompt: 'required' },
  { id: 'seedream_v4_5', name: 'Seedream 4.5', modality: 'image', prompt: 'required' },
  { id: 'seedream_v5_lite', name: 'Seedream V5 Lite', modality: 'image', prompt: 'required' },
  { id: 'grok_image', name: 'Grok Image', modality: 'image', prompt: 'required' },
  { id: 'openai_hazel', name: 'OpenAI Hazel', modality: 'image', prompt: 'required' },
  { id: 'outpaint', name: 'Outpaint', modality: 'image', prompt: 'required', media: 'image' },
  { id: 'recraft_v4_1', name: 'Recraft V4.1', modality: 'image', prompt: 'required' },
  { id: 'image_auto', name: 'Image Auto', modality: 'image', prompt: 'required' },
  { id: 'image_background_remover', name: 'Image Background Remover', modality: 'image', prompt: 'optional', media: 'image' },
  { id: 'z_image', name: 'Z Image', modality: 'image', prompt: 'required' },
  { id: 'kling_omni_image', name: 'Kling O1 Image', modality: 'image', prompt: 'required' },
  { id: 'cinematic_studio_2_5', name: 'Cinematic Studio 2.5', modality: 'image', prompt: 'required' },
  { id: 'soul_cinematic', name: 'Soul Cinematic', modality: 'image', prompt: 'required' },
  { id: 'soul_location', name: 'Soul Location', modality: 'image', prompt: 'required' },
  { id: 'soul_cast', name: 'Soul Cast', modality: 'image', prompt: 'required' },
  { id: 'marketing_studio_image', name: 'Marketing Studio Image', modality: 'image', prompt: 'required' },
  { id: 'brain_activity', name: 'Virality Predictor', modality: 'video', prompt: 'unused', media: 'video' },
  { id: 'gemini_omni', name: 'Gemini Omni Flash', modality: 'video', prompt: 'required' },
  { id: 'veo3_1', name: 'Google Veo 3.1', modality: 'video', prompt: 'required' },
  { id: 'veo3_1_lite', name: 'Google Veo 3.1 Lite', modality: 'video', prompt: 'required' },
  { id: 'veo3', name: 'Google Veo 3', modality: 'video', prompt: 'required' },
  { id: 'kling3_0', name: 'Kling v3.0', modality: 'video', prompt: 'required' },
  { id: 'kling3_0_turbo', name: 'Kling 3.0 Turbo', modality: 'video', prompt: 'required' },
  { id: 'kling2_6', name: 'Kling 2.6 Video', modality: 'video', prompt: 'required' },
  { id: 'seedance_2_5', name: 'Seedance 2.5', modality: 'video', prompt: 'required' },
  { id: 'seedance_2_0', name: 'Seedance 2.0', modality: 'video', prompt: 'required' },
  { id: 'seedance_2_0_mini', name: 'Seedance 2.0 Mini', modality: 'video', prompt: 'required' },
  { id: 'seedance1_5', name: 'Seedance 1.5 Pro', modality: 'video', prompt: 'required' },
  { id: 'wan2_7', name: 'Wan 2.7', modality: 'video', prompt: 'required' },
  { id: 'wan2_6', name: 'Wan 2.6 Video', modality: 'video', prompt: 'required' },
  { id: 'minimax_hailuo', name: 'Minimax Hailuo', modality: 'video', prompt: 'required' },
  { id: 'grok_video', name: 'Grok Video', modality: 'video', prompt: 'required' },
  { id: 'grok_video_v15', name: 'Grok Video 1.5', modality: 'video', prompt: 'required' },
  { id: 'cinematic_studio_3_0', name: 'Cinematic Studio 3.0', modality: 'video', prompt: 'required' },
  { id: 'cinematic_studio_video', name: 'Cinematic Studio Video', modality: 'video', prompt: 'required' },
  { id: 'cinematic_studio_video_3_5', name: 'Cinematic Studio Video 3.5', modality: 'video', prompt: 'required' },
  { id: 'cinematic_studio_video_v2', name: 'Cinematic Studio Video V2', modality: 'video', prompt: 'required' },
  { id: 'marketing_studio_video', name: 'Marketing Studio Video', modality: 'video', prompt: 'required' },
  { id: 'video_background_remover', name: 'Video Background Remover', modality: 'video', prompt: 'optional', media: 'video' },
  { id: 'multi_image_to_3d', name: 'Multi-Image to 3D', modality: '3d', prompt: 'optional', media: 'image' },
  { id: 'image_to_3d', name: 'Image to 3D', modality: '3d', prompt: 'optional', media: 'image' },
  { id: 'tripo_3d', name: 'Text to 3D', modality: '3d', prompt: 'required' },
  { id: 'sam_3_3d', name: '3D Objects', modality: '3d', prompt: 'required' },
  { id: '3d_rigging', name: '3D Rigging', modality: '3d', prompt: 'optional', media: 'image' },
  { id: 'seed_audio', name: 'Seed Audio 1.0', modality: 'audio', prompt: 'required' },
  { id: 'sonilo_music', name: 'Sonilo Music', modality: 'audio', prompt: 'required' },
  { id: 'mirelo_text_to_audio', name: 'Mirelo Text to Audio', modality: 'audio', prompt: 'required' },
  { id: 'text2speech_v2', name: 'Text to Speech', modality: 'audio', prompt: 'required' },
  { id: 'inworld_text_to_speech', name: 'Inworld Text to Speech', modality: 'audio', prompt: 'required' },
]

export const workflows = [
  {
    id: 'draw_to_video',
    name: 'Draw to video',
    detail: 'Edit a source clip from a sketch frame at a timestamp.',
  },
  {
    id: 'reframe',
    name: 'Reframe',
    detail: 'Reframe a source video to a new aspect ratio.',
  },
  {
    id: 'voice-change',
    name: 'Voice change',
    detail: 'Replace the voice on a source video.',
  },
  {
    id: 'dubbing',
    name: 'Dubbing',
    detail: 'Dub a source video into another language.',
  },
] as const

export const skills: SkillEntry[] = [
  {
    id: 'higgsfield-generate',
    title: 'Generate',
    summary:
      'Image, video, 3D, and audio jobs across the public model list, plus Marketing Studio ads and Virality Predictor scoring.',
    chains: 'Train a Soul first when the still or clip has to keep a specific face.',
    command: 'higgsfield generate create',
    upstream: 'https://github.com/higgsfield-ai/skills/tree/main/higgsfield-generate',
    defaultModelId: 'gpt_image_2_5',
  },
  {
    id: 'higgsfield-soul-id',
    title: 'Soul ID',
    summary:
      'Train a reusable Soul character from several photos. The finished reference id is what Generate passes as --soul-id.',
    chains: 'Use the reference with Soul V2 or Soul Cinematic after training finishes.',
    command: 'higgsfield soul-id create',
    upstream: 'https://github.com/higgsfield-ai/skills/tree/main/higgsfield-soul-id',
  },
  {
    id: 'higgsfield-product-photoshoot',
    title: 'Product photoshoot',
    summary:
      'Brand product imagery. The CLI enhances the prompt for the chosen mode, then submits an image job.',
    chains: 'Stays on its own command. Do not send the same brief through plain Generate.',
    command: 'higgsfield product-photoshoot create',
    upstream: 'https://github.com/higgsfield-ai/skills/tree/main/higgsfield-product-photoshoot',
  },
  {
    id: 'higgsfield-brandkit',
    title: 'Brandkit',
    summary:
      'A visual identity: logo marks, palette, type, and the surrounding asset system. The first runnable step here is a Recraft mark.',
    chains: 'Later steps pull in Seedream, GPT Image, and a brand kit fetched from a site URL.',
    command: 'higgsfield generate create recraft_v4_1',
    upstream: 'https://github.com/higgsfield-ai/skills/tree/main/higgsfield-brandkit',
    defaultModelId: 'recraft_v4_1',
  },
  {
    id: 'higgsfield-marketplace-cards',
    title: 'Marketplace cards',
    summary:
      'Main image, secondary product images, and A+ style modules for a marketplace listing.',
    chains: 'Self-contained. The backend applies the listing templates.',
    command: 'higgsfield marketplace-cards create',
    upstream: 'https://github.com/higgsfield-ai/skills/tree/main/higgsfield-marketplace-cards',
  },
  {
    id: 'higgsfield-websites',
    title: 'Websites',
    summary:
      'Create a hosted site, app, or game. The platform provisions the git repo; you edit and deploy from there.',
    chains: 'Apps pick a starter template. Pair with Generate when the page needs original art.',
    command: 'higgsfield website create',
    upstream: 'https://github.com/higgsfield-ai/skills/tree/main/higgsfield-websites',
  },
  {
    id: 'higgsfield-video-explainer',
    title: 'Video explainer',
    summary:
      'A narrated explainer built as matched audio and video blocks, then assembled. This studio runs the narration block.',
    chains: 'Resolve a style, generate every Seed Audio take, then the matching clips, then explainer_video.',
    command: 'higgsfield generate create seed_audio',
    upstream: 'https://github.com/higgsfield-ai/skills/tree/main/higgsfield-video-explainer',
    defaultModelId: 'seed_audio',
  },
  {
    id: 'higgsfield-youtube-thumbnail',
    title: 'YouTube thumbnail',
    summary:
      'A thumbnail or vertical cover. The main render uses Nano Banana Pro, with optional face or logo references.',
    chains: 'Follows a finished video once the topic and the claim on the image are settled.',
    command: 'higgsfield generate create nano_banana_2',
    upstream: 'https://github.com/higgsfield-ai/skills/tree/main/higgsfield-youtube-thumbnail',
    defaultModelId: 'nano_banana_2',
  },
]

export const photoshootModes: PhotoshootMode[] = [
  { id: 'product_shot', label: 'Product shot', detail: 'Neutral, studio, or catalog background.' },
  { id: 'lifestyle_scene', label: 'Lifestyle', detail: 'The product in a real setting.' },
  { id: 'closeup_product_with_person', label: 'Close-up with a person', detail: 'Hands or a partial face, demonstrating.' },
  { id: 'moodboard_pin', label: 'Moodboard pin', detail: 'Vertical pin, moodboard feel.' },
  { id: 'hero_banner', label: 'Hero banner', detail: 'Wide header for a site, email, or campaign.' },
  { id: 'social_carousel', label: 'Social carousel', detail: 'Connected slides for a feed.' },
  { id: 'ad_creative_pack', label: 'Ad pack', detail: 'A coordinated set of static ad variants.' },
  { id: 'virtual_model_tryout', label: 'Virtual try-on', detail: 'The product worn or used by a rendered model.' },
  { id: 'conceptual_product', label: 'Conceptual', detail: 'Surreal, CGI, splash, or sculptural treatment.' },
  { id: 'restyle', label: 'Restyle', detail: 'Change the mood of an existing shot.' },
]

export const marketplaceScopes = [
  { id: 'main', label: 'Main image' },
  { id: 'product-images', label: 'Product images' },
  { id: 'aplus', label: 'A+ modules' },
  { id: 'full-set', label: 'Full set' },
] as const

export const websiteTemplates = ['app-detail', 'preset', 'studio', 'custom'] as const

export const aspectRatios = ['', '1:1', '4:5', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3'] as const

export function modelById(id: string): ModelEntry | undefined {
  return models.find((model) => model.id === id)
}

export function skillById(id: string): SkillEntry | undefined {
  return skills.find((skill) => skill.id === id)
}

export function emptyDraft(skillId: SkillEntry['id'] = 'higgsfield-generate'): import('./types').JobDraft {
  const skill = skillById(skillId) ?? skills[0]
  return {
    skillId: skill.id,
    modelId: skill.defaultModelId ?? 'gpt_image_2_5',
    prompt: '',
    aspectRatio: '',
    photoshootMode: 'product_shot',
    marketplaceScope: 'product-images',
    websiteType: 'website',
    websiteTemplate: 'studio',
    websiteCategory: 'other',
    subdomain: '',
    characterName: '',
    imagePath: '',
    videoPath: '',
  }
}
