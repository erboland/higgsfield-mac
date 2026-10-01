import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { test } from 'node:test'
import { LOCAL_MODEL_ID, LOCAL_MODEL_NAME, localMediaKind } from '../src/shared/localRun.ts'

test('local media is image or video, and training or audio stays off this runner', () => {
  assert.equal(localMediaKind({ kind: 'image', prompt: 'a cup on a table', skillId: 'higgsfield-generate' }), 'image')
  assert.equal(localMediaKind({ kind: 'video', prompt: 'rain on a platform', skillId: 'higgsfield-generate' }), 'video')
  assert.equal(localMediaKind({ kind: 'product', prompt: 'a kettle', skillId: 'higgsfield-product-photoshoot' }), 'image')
  assert.equal(localMediaKind({ kind: 'audio', prompt: 'rain', skillId: 'higgsfield-generate' }), null)
  assert.equal(localMediaKind({ kind: '3d', prompt: 'a fox', skillId: 'higgsfield-generate' }), null)
  assert.equal(localMediaKind({ category: 'sites', prompt: 'portfolio', skillId: 'higgsfield-websites' }), null)
  assert.equal(localMediaKind({ skillId: 'higgsfield-soul-id', prompt: 'Avery', category: 'identity' }), null)
  assert.equal(localMediaKind({ category: 'video', prompt: 'a forest', skillId: 'higgsfield-generate' }), 'video')
  assert.equal(localMediaKind({ kind: 'image', prompt: '   ' }), null)
})

test('the runner names the open model and not a hosted Higgsfield model', () => {
  const script = path.resolve('runner/local_generate.py')
  const result = spawnSync('python3', [script, '--describe'], { encoding: 'utf8' })
  assert.equal(result.status, 0)
  const described = JSON.parse(result.stdout) as { modelId: string; modelName: string }
  assert.equal(described.modelId, LOCAL_MODEL_ID)
  assert.equal(described.modelName, LOCAL_MODEL_NAME)
  assert.equal(described.modelId, 'nota-ai/bk-sdm-tiny')
  assert.doesNotMatch(described.modelName, /soul|kling|veo|seedance/i)
})
