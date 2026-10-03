import fs from 'node:fs'
import path from 'node:path'
import { DEFAULT_LOCAL_MODEL_ID, HOSTED_WITHOUT_WEIGHTS, OPEN_MODELS, openModel } from './openModels.ts'

export { DEFAULT_LOCAL_MODEL_ID, HOSTED_WITHOUT_WEIGHTS, OPEN_MODELS, openModel }

const SNAPSHOT_FILES = [
  'model_index.json',
  'feature_extractor/preprocessor_config.json',
  'scheduler/scheduler_config.json',
  'text_encoder/config.json',
  'text_encoder/model.safetensors',
  'tokenizer/tokenizer_config.json',
  'tokenizer/vocab.json',
  'tokenizer/merges.txt',
  'unet/config.json',
  'unet/diffusion_pytorch_model.safetensors',
  'vae/config.json',
  'vae/diffusion_pytorch_model.safetensors',
] as const

const WEIGHT_SUFFIXES = ['.safetensors', '.ckpt']

export type LocalModelChoice = {
  id: string
  name: string
  detail: string
  installed: boolean
  selectable: boolean
  kind: 'open' | 'checkpoint' | 'hosted'
}

export type LocalModelList = {
  models: LocalModelChoice[]
  comfyFolders: string[]
}

export function repoFolder(modelId: string): string {
  return `models--${modelId.replaceAll('/', '--')}`
}

export function checkpointModelId(filePath: string): string {
  return `checkpoint:${encodeURIComponent(filePath)}`
}

export function checkpointPathFromId(id: string): string | null {
  if (!id.startsWith('checkpoint:')) return null
  try {
    const filePath = decodeURIComponent(id.slice('checkpoint:'.length))
    if (!filePath || filePath.includes('\0')) return null
    return filePath
  } catch {
    return null
  }
}

function fileReady(filePath: string): boolean {
  try {
    return fs.statSync(filePath).isFile() && fs.statSync(filePath).size > 0
  } catch {
    return false
  }
}

function snapshotDir(cacheDir: string, modelId: string): string | null {
  const repo = path.join(cacheDir, repoFolder(modelId))
  const ref = path.join(repo, 'refs', 'main')
  const snapshots = path.join(repo, 'snapshots')
  if (fileReady(ref)) {
    const revision = fs.readFileSync(ref, 'utf8').trim()
    if (revision) return path.join(snapshots, revision)
  }
  if (!fs.existsSync(snapshots)) return null
  const children = fs
    .readdirSync(snapshots, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
  if (children.length === 1) return path.join(snapshots, children[0])
  return null
}

export function snapshotReady(cacheDir: string, modelId: string): boolean {
  const snapshot = snapshotDir(cacheDir, modelId)
  if (!snapshot) return false
  return SNAPSHOT_FILES.every((relative) => fileReady(path.join(snapshot, relative)))
}

export function modelIsInstalled(modelId: string, caches: string[]): boolean {
  return caches.some((cache) => snapshotReady(cache, modelId))
}

type ModelEnv = {
  HF_HUB_CACHE?: string
  HUGGINGFACE_HUB_CACHE?: string
  HF_HOME?: string
}

export function modelEnv(env: NodeJS.ProcessEnv): ModelEnv {
  const read = env as Record<string, string | undefined>
  return {
    HF_HUB_CACHE: read.HF_HUB_CACHE,
    HUGGINGFACE_HUB_CACHE: read.HUGGINGFACE_HUB_CACHE,
    HF_HOME: read.HF_HOME,
  }
}

export function cacheDirs(modelHome: string, home: string, env: ModelEnv = {}): string[] {
  const dirs = [modelHome]
  const parent = path.dirname(modelHome)
  if (parent && parent !== modelHome) dirs.push(parent)
  for (const key of ['HF_HUB_CACHE', 'HUGGINGFACE_HUB_CACHE'] as const) {
    const value = env[key]?.trim()
    if (value) dirs.push(path.resolve(value))
  }
  const hfHome = env.HF_HOME?.trim()
  if (hfHome) dirs.push(path.join(path.resolve(hfHome), 'hub'))
  dirs.push(path.join(home, '.cache', 'huggingface', 'hub'))
  return [...new Set(dirs.map((dir) => path.resolve(dir)))]
}

function configuredBase(supportDir: string): string | null {
  const configPath = path.join(supportDir, 'config.json')
  if (fs.existsSync(configPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8')) as { basePath?: unknown }
      if (typeof parsed.basePath === 'string' && parsed.basePath.trim()) return parsed.basePath.trim()
    } catch {
      // A broken desktop config is not a checkpoint folder.
    }
  }
  const yamlPath = path.join(supportDir, 'extra_models_config.yaml')
  if (!fs.existsSync(yamlPath)) return null
  const match = fs.readFileSync(yamlPath, 'utf8').match(/^\s*base_path:\s*["']?([^"'\n#]+)/m)
  return match?.[1]?.trim() || null
}

export function comfyCheckpointDirs(home: string): string[] {
  const dirs = [
    path.join(home, 'ComfyUI', 'models', 'checkpoints'),
    path.join(home, 'Documents', 'ComfyUI', 'models', 'checkpoints'),
    path.join(home, 'Library', 'Application Support', 'ComfyUI', 'models', 'checkpoints'),
    path.join(home, 'Library', 'Application Support', 'Comfy Desktop', 'models', 'checkpoints'),
  ]
  for (const support of [
    path.join(home, 'Library', 'Application Support', 'ComfyUI'),
    path.join(home, 'Library', 'Application Support', 'Comfy Desktop'),
  ]) {
    const base = configuredBase(support)
    if (base) dirs.push(path.join(base, 'models', 'checkpoints'))
  }
  return [...new Set(dirs.map((dir) => path.resolve(dir)))]
}

function insideRoot(root: string, target: string): boolean {
  const relative = path.relative(root, target)
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))
}

function realDir(dir: string): string | null {
  try {
    const resolved = fs.realpathSync(dir)
    return fs.statSync(resolved).isDirectory() ? resolved : null
  } catch {
    return null
  }
}

export function listCheckpointFiles(roots: string[]): string[] {
  const found: string[] = []
  const seen = new Set<string>()
  for (const root of roots) {
    const realRoot = realDir(root)
    if (!realRoot) continue
    const pending = [realRoot]
    let depth = 0
    while (pending.length > 0 && found.length < 200 && depth < 4) {
      const next: string[] = []
      for (const dir of pending) {
        let entries: fs.Dirent[] = []
        try {
          entries = fs.readdirSync(dir, { withFileTypes: true })
        } catch {
          continue
        }
        for (const entry of entries) {
          if (entry.name.startsWith('.')) continue
          const full = path.join(dir, entry.name)
          let real = full
          try {
            real = fs.realpathSync(full)
          } catch {
            continue
          }
          if (!insideRoot(realRoot, real)) continue
          if (entry.isDirectory()) {
            next.push(real)
            continue
          }
          if (!entry.isFile()) continue
          const suffix = path.extname(entry.name).toLowerCase()
          if (!WEIGHT_SUFFIXES.includes(suffix)) continue
          if (!fileReady(real) || seen.has(real)) continue
          seen.add(real)
          found.push(real)
        }
      }
      pending.splice(0, pending.length, ...next)
      depth += 1
    }
  }
  return found.sort((left, right) => path.basename(left).localeCompare(path.basename(right)))
}

export function resolveCheckpoint(modelId: string, roots: string[]): string | null {
  const filePath = checkpointPathFromId(modelId)
  if (!filePath) return null
  let resolved: string
  try {
    resolved = fs.realpathSync(filePath)
  } catch {
    return null
  }
  const suffix = path.extname(resolved).toLowerCase()
  if (!WEIGHT_SUFFIXES.includes(suffix) || !fileReady(resolved)) return null
  const allowed = roots.some((root) => {
    const realRoot = realDir(root)
    return realRoot != null && insideRoot(realRoot, resolved)
  })
  return allowed ? resolved : null
}

export function listLocalModels(input: { home: string; modelHome: string; env?: ModelEnv }): LocalModelList {
  const home = path.resolve(input.home)
  const modelHome = path.resolve(input.modelHome)
  const caches = cacheDirs(modelHome, home, input.env)
  const checkpointRoots = [...comfyCheckpointDirs(home), path.join(modelHome, 'checkpoints')]
  const comfyFolders = comfyCheckpointDirs(home).filter((dir) => realDir(dir))
  const installedFiles = listCheckpointFiles(checkpointRoots)
  const models: LocalModelChoice[] = []

  for (const model of OPEN_MODELS) {
    const installed = modelIsInstalled(model.id, caches)
    models.push({
      id: model.id,
      name: model.name,
      detail: model.summary,
      installed,
      selectable: true,
      kind: 'open',
    })
  }

  for (const filePath of installedFiles) {
    models.push({
      id: checkpointModelId(filePath),
      name: path.basename(filePath),
      detail: filePath,
      installed: true,
      selectable: true,
      kind: 'checkpoint',
    })
  }

  for (const hosted of HOSTED_WITHOUT_WEIGHTS) {
    models.push({
      id: hosted.id,
      name: hosted.name,
      detail: 'No public weights. This app cannot download it.',
      installed: false,
      selectable: false,
      kind: 'hosted',
    })
  }

  return { models, comfyFolders }
}

export type RunnableModel =
  | { modelId: string; name: string; checkpointPath?: undefined }
  | { modelId: string; name: string; checkpointPath: string }

export function resolveRunnable(
  modelId: string | undefined,
  input: { home: string; modelHome: string; env?: ModelEnv },
): RunnableModel | null {
  const id = modelId?.trim() || DEFAULT_LOCAL_MODEL_ID
  const open = openModel(id)
  if (open) return { modelId: open.id, name: open.name }
  if (HOSTED_WITHOUT_WEIGHTS.some((hosted) => hosted.id === id)) return null
  const home = path.resolve(input.home)
  const modelHome = path.resolve(input.modelHome)
  const roots = [...comfyCheckpointDirs(home), path.join(modelHome, 'checkpoints')]
  const checkpointPath = resolveCheckpoint(id, roots)
  if (!checkpointPath) return null
  return { modelId: id, name: path.basename(checkpointPath), checkpointPath }
}
