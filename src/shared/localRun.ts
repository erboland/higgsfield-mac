import type { SkillId } from './types.ts'

export const LOCAL_MODEL_ID = 'nota-ai/bk-sdm-tiny'
export const LOCAL_MODEL_NAME = 'BK-SDM Tiny'

export type LocalKind = 'image' | 'video'

const AUDIO_OR_STRUCTURE = new Set<SkillId>([
  'higgsfield-soul-id',
  'higgsfield-websites',
  'higgsfield-video-explainer',
])

export function localMediaKind(input: {
  skillId?: SkillId
  kind?: string
  category?: string
  prompt?: string
}): LocalKind | null {
  const prompt = input.prompt?.trim() ?? ''
  if (!prompt) return null
  if (input.skillId && AUDIO_OR_STRUCTURE.has(input.skillId)) return null
  if (input.kind === 'audio' || input.kind === '3d') return null
  if (input.category === 'audio' || input.category === 'sites' || input.category === '3d') return null
  if (input.kind === 'video' || input.category === 'video') return 'video'
  return 'image'
}
