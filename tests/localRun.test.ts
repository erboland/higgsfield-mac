import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import os from 'node:os'
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

test('a partial BK-SDM Tiny snapshot is deleted and the pipeline call does not pass dtype', () => {
  const source = readFileSync('runner/local_generate.py', 'utf8')
  assert.match(source, /torch_dtype=torch\.float32/)
  assert.doesNotMatch(source, /["']dtype["']\s*:/)
  assert.doesNotMatch(source, /(?<!torch_)dtype=torch\.float32/)

  const home = mkdtempSync(path.join(os.tmpdir(), 'higgsfield-home-'))
  const root = mkdtempSync(path.join(os.tmpdir(), 'higgsfield-support-'))
  const modelHome = path.join(root, 'models')
  const repo = path.join(root, 'models--nota-ai--bk-sdm-tiny')
  const broken = path.join(repo, 'snapshots', '0364108e53b7f7f4d2585e817a0b7a83dc261cfa')
  mkdirSync(broken, { recursive: true })
  mkdirSync(path.join(repo, 'refs'), { recursive: true })
  writeFileSync(path.join(repo, 'refs', 'main'), '0364108e53b7f7f4d2585e817a0b7a83dc261cfa')
  writeFileSync(path.join(broken, 'model_index.json'), '{}\n')

  const probe = `
import importlib.util
import os
import sys
spec = importlib.util.spec_from_file_location("local_generate", sys.argv[1])
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
app_cache = __import__("pathlib").Path(sys.argv[2])
ready = module.repair_caches(app_cache)
print("ready" if ready is not None else "missing")
print("partial" if (app_cache.parent / module.REPO_DIR).exists() else "deleted")
`
  const result = spawnSync('python3', ['-c', probe, path.resolve('runner/local_generate.py'), modelHome], {
    encoding: 'utf8',
    env: {
      ...process.env,
      HOME: home,
      HF_HOME: '',
      HF_HUB_CACHE: '',
      HUGGINGFACE_HUB_CACHE: '',
    },
  })
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /missing/)
  assert.match(result.stdout, /deleted/)
  assert.equal(existsSync(path.join(root, 'models--nota-ai--bk-sdm-tiny')), false)
})

test('the packaged runner does not tell the user to create a venv', () => {
  const source = readFileSync('runner/generate.ts', 'utf8')
  assert.doesNotMatch(source, /pip install/)
  assert.match(source, /does not include the local runtime/)
})
