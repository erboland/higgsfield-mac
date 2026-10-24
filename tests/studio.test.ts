import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { summarizeRea } from '../src/shared/reaSummary.ts'
import { BASE_MODEL_ID, canAttach, canDownloadModel, canRunModel, isHostedModel, MODEL_FOLDERS, OPEN_MODEL_ID, SDXL_MODEL_ID } from '../src/shared/studioModels.ts'
import { LOCAL_TEMPLATES, STUDIO_ASPECTS } from '../src/shared/studioTemplates.ts'
import { rowFromProgress } from '../src/shared/downloadRow.ts'

test('public studio presets stay on the open checkpoint', () => {
  const titles = LOCAL_TEMPLATES.map((entry) => entry.title)
  assert.deepEqual(titles, ['Editorial still', 'Lifestyle at home', 'Product hero shot', 'UGC review'])
  for (const entry of LOCAL_TEMPLATES) {
    assert.equal(STUDIO_ASPECTS.includes(entry.aspect), true)
    assert.equal(entry.runnable, true)
    assert.ok(entry.prompt.length > 20)
  }
  assert.ok(MODEL_FOLDERS.includes('checkpoints'))
  assert.ok(MODEL_FOLDERS.includes('text_encoders'))
})

test('hosted Higgsfield names cannot be downloaded or run', () => {
  for (const id of ['text2image_soul_v2', 'kling3_0', 'kling4_0', 'veo3_1', 'seedance_2_0', 'seedance_2_5', 'genjutsu', 'sora_2']) {
    assert.equal(isHostedModel(id), true)
    assert.equal(canDownloadModel(id), false)
    assert.equal(canRunModel(id), false)
  }
  assert.equal(canDownloadModel(OPEN_MODEL_ID), true)
  assert.equal(canDownloadModel(SDXL_MODEL_ID), true)
  assert.equal(canRunModel(SDXL_MODEL_ID), true)
  assert.equal(canDownloadModel(BASE_MODEL_ID), true)
  assert.equal(canRunModel(BASE_MODEL_ID), true)
  assert.equal(canRunModel('file:checkpoints/sd_xl_turbo_1.0_fp16.safetensors'), true)
  assert.equal(canRunModel('file:checkpoints/sd_xl_base_1.0.safetensors'), true)
  assert.equal(canRunModel('file:diffusion_models/flux_unet.safetensors'), true)
  assert.equal(canRunModel('file:loras/detail.safetensors'), false)
  assert.equal(canAttach('file:loras/detail.safetensors', 'loras'), true)
  assert.equal(canAttach('file:vae/sdxl.vae.safetensors', 'vae'), true)
  assert.equal(canAttach('file:embeddings/style.pt', 'embeddings'), true)
  assert.equal(canAttach('file:loras/detail.safetensors', 'vae'), false)
  assert.equal(canRunModel('file:checkpoints/../secret.safetensors'), false)
  assert.equal(canRunModel('nota-ai/bk-sdm-tiny'), false)
})

test('REA summaries keep only facts present in the report', () => {
  const parsed = summarizeRea({
    artifact: { format: 'safetensors', file_size: 3463726504, tensors: new Array(12), dtypes: ['F32'] },
  })
  assert.equal(parsed.available, true)
  assert.equal(parsed.format, 'safetensors')
  assert.equal(parsed.tensors, 12)
  assert.equal(parsed.fileBytes, 3463726504)
  assert.deepEqual(parsed.dtypes, ['F32'])
  assert.equal(summarizeRea(null, 'missing binary').available, false)
  assert.match(summarizeRea(null, 'missing binary').detail, /missing binary/)
})

test('download rows keep percent, folder, and filename', () => {
  const row = rowFromProgress({
    phase: 'download',
    detail: 'Downloading SD Turbo, 40%',
    percent: 40,
    bytes: 1000,
    total: 2500,
    speed: 100,
    eta: 15,
    filename: 'diffusion_pytorch_model.safetensors',
    folder: 'checkpoints',
    status: 'active',
  })
  assert.ok(row)
  assert.equal(row?.percent, 40)
  assert.equal(row?.folder, 'checkpoints')
  assert.equal(row?.status, 'active')
})

test('the studio runner allow-lists files and does not pass dtype', () => {
  const source = readFileSync('runner/studio_generate.py', 'utf8')
  assert.match(source, /allow_patterns/)
  assert.doesNotMatch(source, /ignore_patterns/)
  assert.match(source, /torch_dtype=torch\.float32/)
  assert.doesNotMatch(source, /(?<!torch_)dtype=/)
  assert.match(source, /inspect-model-artifact/)
  assert.match(source, /MODEL_ID = "stabilityai\/sd-turbo"/)
  assert.match(source, /stabilityai\/sdxl-turbo/)
  assert.match(source, /stabilityai\/stable-diffusion-xl-base-1.0/)
  assert.match(source, /6938078334/)
  assert.match(source, /BASE_STEPS = 20/)
  assert.match(source, /load_lora_weights/)
  assert.match(source, /AutoencoderKL.from_single_file/)
  assert.match(source, /load_textual_inversion/)
  assert.match(source, /\.part/)
  assert.match(source, /os\.replace\(part, dest\)/)
  assert.match(source, /nota-ai\/bk-sdm-tiny/)
  assert.match(source, /Resolving models/)
  assert.match(source, /"16:9": \(512, 288\)/)
})
