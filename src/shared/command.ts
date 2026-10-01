import {
  aspectRatios,
  marketplaceScopes,
  modelById,
  photoshootModes,
  skillById,
  websiteTemplates,
} from './catalog.ts'
import type { BuiltCommand, JobDraft } from './types.ts'

const PROMPT_LIMIT = 8000

export function quotePosix(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`
}

export function buildCommand(draft: JobDraft): BuiltCommand | { error: string } {
  const skill = skillById(draft.skillId)
  if (!skill) return { error: 'Unknown skill.' }

  switch (draft.skillId) {
    case 'higgsfield-soul-id':
      return buildSoul(draft)
    case 'higgsfield-product-photoshoot':
      return buildPhotoshoot(draft)
    case 'higgsfield-marketplace-cards':
      return buildMarketplace(draft)
    case 'higgsfield-websites':
      return buildWebsite(draft)
    default:
      return buildGenerate(draft)
  }
}

function buildGenerate(draft: JobDraft): BuiltCommand | { error: string } {
  const model = modelById(draft.modelId)
  if (!model) return { error: 'Pick a model from the catalog.' }
  const prompt = draft.prompt.trim()
  if (model.prompt === 'required' && !prompt) return { error: 'Write a prompt first.' }
  if (prompt.length > PROMPT_LIMIT) return { error: 'Prompt is too long.' }

  const image = safeUserPath(draft.imagePath, 'Image path')
  if (typeof image !== 'string') return image
  const video = safeUserPath(draft.videoPath, 'Video path')
  if (typeof video !== 'string') return video
  if (model.media === 'video' && model.prompt === 'unused' && !video) {
    return { error: 'Virality Predictor needs a video path.' }
  }

  const argv = ['generate', 'create', model.id]
  if (model.prompt !== 'unused' && prompt) argv.push('--prompt', prompt)
  if (draft.aspectRatio && (model.modality === 'image' || model.modality === 'video')) {
    if (!aspectRatios.includes(draft.aspectRatio as (typeof aspectRatios)[number])) {
      return { error: 'Unknown aspect ratio.' }
    }
    argv.push('--aspect_ratio', draft.aspectRatio)
  }
  if (image && model.media !== 'video') argv.push('--image', image)
  if (video) argv.push('--video', video)
  argv.push('--wait')
  return finish(argv, `${model.name} · ${model.id}`)
}

function safeUserPath(value: string, label: string): string | { error: string } {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (trimmed.includes('\0') || /[\r\n]/.test(trimmed)) return { error: `${label} cannot contain line breaks.` }
  if (trimmed.startsWith('-')) return { error: `${label} must not start with a dash.` }
  return trimmed
}

function buildSoul(draft: JobDraft): BuiltCommand | { error: string } {
  const name = draft.characterName.trim()
  if (!name || /[\r\n]/.test(name)) return { error: 'Name the Soul character.' }
  const image = safeUserPath(draft.imagePath, 'Photo path')
  if (typeof image !== 'string') return image
  if (!image) return { error: 'Add at least one photo path. Training needs several; this job records the first.' }
  const argv = ['soul-id', 'create', '--name', name, '--soul-2', '--image', image]
  return finish(argv, `Soul ID · ${name}`)
}

function buildPhotoshoot(draft: JobDraft): BuiltCommand | { error: string } {
  const mode = photoshootModes.find((item) => item.id === draft.photoshootMode)
  if (!mode) return { error: 'Pick a photoshoot mode.' }
  const prompt = draft.prompt.trim()
  if (!prompt) return { error: 'Describe the product shot.' }
  if (prompt.length > PROMPT_LIMIT) return { error: 'Prompt is too long.' }
  const image = safeUserPath(draft.imagePath, 'Image path')
  if (typeof image !== 'string') return image
  const argv = ['product-photoshoot', 'create', '--mode', mode.id, '--prompt', prompt]
  if (image) argv.push('--image', image)
  if (draft.aspectRatio) {
    if (!aspectRatios.includes(draft.aspectRatio as (typeof aspectRatios)[number])) {
      return { error: 'Unknown aspect ratio.' }
    }
    argv.push('--aspect_ratio', draft.aspectRatio)
  }
  return finish(argv, `Photoshoot · ${mode.label}`)
}

function buildMarketplace(draft: JobDraft): BuiltCommand | { error: string } {
  const scope = marketplaceScopes.find((item) => item.id === draft.marketplaceScope)
  if (!scope) return { error: 'Pick a marketplace scope.' }
  const prompt = draft.prompt.trim()
  if (!prompt) return { error: 'Describe the listing.' }
  if (prompt.length > PROMPT_LIMIT) return { error: 'Prompt is too long.' }
  const image = safeUserPath(draft.imagePath, 'Image path')
  if (typeof image !== 'string') return image
  const argv = ['marketplace-cards', 'create', '--scope', scope.id, '--prompt', prompt]
  if (image) argv.push('--image', image)
  return finish(argv, `Marketplace · ${scope.label}`)
}

function buildWebsite(draft: JobDraft): BuiltCommand | { error: string } {
  if (draft.websiteType !== 'website' && draft.websiteType !== 'app' && draft.websiteType !== 'game') {
    return { error: 'Pick a site type.' }
  }
  const category = draft.websiteCategory.trim()
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(category)) {
    return { error: 'Category is a slug such as other or ads-marketing.' }
  }
  const argv = ['website', 'create', '--type', draft.websiteType, '--category', category]
  if (draft.websiteType === 'app') {
    if (!websiteTemplates.includes(draft.websiteTemplate as (typeof websiteTemplates)[number])) {
      return { error: 'Pick an app template.' }
    }
    argv.push('--template', draft.websiteTemplate)
  }
  const subdomain = draft.subdomain.trim()
  if (subdomain) {
    if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(subdomain)) {
      return { error: 'Subdomain must be DNS-safe: letters, digits, single hyphens.' }
    }
    argv.push('--subdomain', subdomain)
  }
  const label = draft.websiteType === 'app' ? `app/${draft.websiteTemplate}` : draft.websiteType
  return finish(argv, `Website · ${label}`)
}

function finish(argv: string[], summary: string): BuiltCommand {
  return {
    argv,
    display: ['higgsfield', ...argv.map(quotePosix)].join(' '),
    summary,
  }
}
