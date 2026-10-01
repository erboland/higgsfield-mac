import assert from 'node:assert/strict'
import { test } from 'node:test'
import { models, skills } from '../src/shared/catalog.ts'
import { buildCommand, quotePosix } from '../src/shared/command.ts'
import { emptyDraft } from '../src/shared/catalog.ts'

test('image generation builds an allowlisted argv', () => {
  const draft = emptyDraft()
  draft.prompt = "neon city at dusk"
  draft.aspectRatio = '16:9'
  const built = buildCommand(draft)
  assert.ok(!('error' in built))
  if ('error' in built) return
  assert.deepEqual(built.argv.slice(0, 3), ['generate', 'create', 'gpt_image_2_5'])
  assert.ok(built.argv.includes('--wait'))
  assert.ok(built.argv.includes('--aspect_ratio'))
  assert.equal(built.argv.at(-1), '--wait')
  assert.match(built.display, /^higgsfield /)
})

test('virality predictor takes a video and no prompt', () => {
  const draft = emptyDraft()
  draft.modelId = 'brain_activity'
  draft.videoPath = '/tmp/ad.mp4'
  const built = buildCommand(draft)
  assert.ok(!('error' in built))
  if ('error' in built) return
  assert.equal(built.argv.includes('--prompt'), false)
  assert.ok(built.argv.includes('--video'))
})

test('unknown model is rejected', () => {
  const draft = emptyDraft()
  draft.modelId = 'not-a-model'
  draft.prompt = 'hello'
  const built = buildCommand(draft)
  assert.deepEqual(built, { error: 'Pick a model from the catalog.' })
})

test('paths that look like flags are rejected', () => {
  const draft = emptyDraft()
  draft.prompt = 'hello'
  draft.imagePath = '--help'
  const built = buildCommand(draft)
  assert.ok('error' in built)
})

test('soul training command', () => {
  const draft = emptyDraft('higgsfield-soul-id')
  draft.characterName = 'Ada'
  draft.imagePath = '/tmp/ada.png'
  const built = buildCommand(draft)
  assert.ok(!('error' in built))
  if ('error' in built) return
  assert.deepEqual(built.argv, ['soul-id', 'create', '--name', 'Ada', '--soul-2', '--image', '/tmp/ada.png'])
})

test('photoshoot uses its own subcommand', () => {
  const draft = emptyDraft('higgsfield-product-photoshoot')
  draft.photoshootMode = 'lifestyle_scene'
  draft.prompt = 'cold brew on a counter'
  const built = buildCommand(draft)
  assert.ok(!('error' in built))
  if ('error' in built) return
  assert.equal(built.argv[0], 'product-photoshoot')
  assert.ok(built.argv.includes('--mode'))
})

test('website app includes a template and a plain website does not', () => {
  const site = emptyDraft('higgsfield-websites')
  const plain = buildCommand(site)
  assert.ok(!('error' in plain))
  if ('error' in plain) return
  assert.equal(plain.argv.includes('--template'), false)

  site.websiteType = 'app'
  site.websiteTemplate = 'studio'
  site.subdomain = 'my-app'
  const app = buildCommand(site)
  assert.ok(!('error' in app))
  if ('error' in app) return
  assert.ok(app.argv.includes('--template'))
  assert.ok(app.argv.includes('studio'))
  assert.ok(app.argv.includes('--subdomain'))
})

test('posix quoting keeps spaces and quotes inside one argument', () => {
  assert.equal(quotePosix("a b"), "'a b'")
  assert.equal(quotePosix("it's"), "'it'\\''s'")
})

test('catalog covers every skill and every modality', () => {
  assert.equal(skills.length, 8)
  assert.ok(models.some((model) => model.modality === 'image'))
  assert.ok(models.some((model) => model.modality === 'video'))
  assert.ok(models.some((model) => model.modality === '3d'))
  assert.ok(models.some((model) => model.modality === 'audio'))
  assert.equal(new Set(models.map((model) => model.id)).size, models.length)
})
