import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { HOSTED_WITHOUT_WEIGHTS } from '../src/shared/openModels.ts'
import { listLocalModels, resolveRunnable, snapshotReady } from '../src/shared/modelLibrary.ts'

test('the library lists a stronger checkpoint, a local ComfyUI file, and hosted models without weights', () => {
  const home = mkdtempSync(path.join(os.tmpdir(), 'higgsfield-home-'))
  const modelHome = path.join(home, 'models')
  const base = path.join(home, 'ComfyFiles')
  const checkpoints = path.join(base, 'models', 'checkpoints')
  mkdirSync(checkpoints, { recursive: true })
  writeFileSync(path.join(checkpoints, 'dream.safetensors'), 'weights')
  const support = path.join(home, 'Library', 'Application Support', 'ComfyUI')
  mkdirSync(support, { recursive: true })
  writeFileSync(path.join(support, 'config.json'), JSON.stringify({ basePath: base }))

  const broken = path.join(
    modelHome,
    'models--runwayml--stable-diffusion-v1-5',
    'snapshots',
    'incomplete',
  )
  mkdirSync(broken, { recursive: true })
  writeFileSync(path.join(broken, 'model_index.json'), '{}\n')
  assert.equal(snapshotReady(modelHome, 'runwayml/stable-diffusion-v1-5'), false)

  const list = listLocalModels({ home, modelHome, env: { HF_HOME: '', HF_HUB_CACHE: '', HUGGINGFACE_HUB_CACHE: '' } })
  const sd15 = list.models.find((model) => model.id === 'runwayml/stable-diffusion-v1-5')
  const tiny = list.models.find((model) => model.id === 'nota-ai/bk-sdm-tiny')
  const file = list.models.find((model) => model.kind === 'checkpoint')
  assert.equal(sd15?.selectable, true)
  assert.equal(sd15?.installed, false)
  assert.equal(tiny?.name, 'BK-SDM Tiny')
  assert.equal(file?.name, 'dream.safetensors')
  assert.equal(file?.installed, true)
  assert.ok(list.comfyFolders.some((folder) => folder.endsWith(`${path.sep}models${path.sep}checkpoints`)))

  for (const hosted of HOSTED_WITHOUT_WEIGHTS) {
    const card = list.models.find((model) => model.id === hosted.id)
    assert.equal(card?.selectable, false)
    assert.equal(card?.kind, 'hosted')
    assert.match(card?.detail ?? '', /No public weights/)
  }
  assert.equal(resolveRunnable('text2image_soul_v2', { home, modelHome }), null)
  assert.equal(resolveRunnable('kling3_0', { home, modelHome }), null)
  assert.equal(resolveRunnable('runwayml/stable-diffusion-v1-5', { home, modelHome })?.checkpointPath, undefined)
  assert.equal(resolveRunnable(file?.id, { home, modelHome })?.name, 'dream.safetensors')
})
