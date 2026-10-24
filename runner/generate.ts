import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { homeForPictures, usableFolder } from '../src/shared/outputFolder.ts'
import { OPEN_MODEL_ID, canAttach, canRunModel, type AddonFolder, type LibraryReport, type StudioKind } from '../src/shared/studioModels.ts'
import type { LocalGeneration, LocalProgress } from '../src/shared/types.ts'

function repoRoot(): string {
  if (process.env.HIGGSFIELD_ROOT) return process.env.HIGGSFIELD_ROOT
  if (process.env.APP_ROOT) return process.env.APP_ROOT
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
}

export function bundledPython(candidates: string[]): string | null {
  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) return candidate
  }
  return null
}

function pythonBin(): string {
  const resources = process.resourcesPath ?? ''
  const found = bundledPython([
    path.join(resources, 'python', 'bin', 'python3'),
    path.join(repoRoot(), 'vendor', 'python', 'bin', 'python3'),
    path.join(repoRoot(), 'runner', '.venv', 'bin', 'python'),
  ])
  if (!found) throw new Error('This build does not include the local runtime.')
  return found
}

export function localOutputDir(directory: string, home = os.homedir()): string {
  return usableFolder(directory, homeForPictures([home, os.homedir()]))
}

export async function generateLocal(input: {
  prompt: string
  kind: StudioKind
  directory: string
  modelId?: string
  aspectRatio?: string
  loraId?: string
  vaeId?: string
  embeddingId?: string
  modelHome?: string
  homeDir?: string
  onProgress?: (progress: LocalProgress) => void
}): Promise<LocalGeneration> {
  const prompt = input.prompt.trim()
  const modelId = input.modelId?.trim() || OPEN_MODEL_ID
  if (!prompt) throw new Error('Write a prompt before Generate.')
  if (input.kind !== 'image' && input.kind !== 'video') {
    throw new Error('Generate writes an image or a local clip.')
  }
  if (!canRunModel(modelId)) {
    throw new Error(`${modelId} has no public weights in this app.`)
  }
  const home = homeForPictures([input.homeDir ?? '', os.homedir()])
  const outputDir = localOutputDir(input.directory, home)
  await fs.mkdir(outputDir, { recursive: true })
  const modelHome = input.modelHome?.trim() || path.join(home, 'Library', 'Application Support', 'Higgsfield', 'models')
  await fs.mkdir(modelHome, { recursive: true })
  const root = repoRoot()
  const script = [
    path.join(process.resourcesPath ?? '', 'runner', 'studio_generate.py'),
    path.join(root, 'runner', 'studio_generate.py'),
  ].find((candidate) => candidate && existsSync(candidate))
  if (!script) throw new Error('This build does not include the local runtime.')
  const fileStem = `studio-${Date.now()}`
  const aspectRatio = input.aspectRatio?.trim() || '1:1'
  const loraId = addonId(input.loraId, 'loras')
  const vaeId = addonId(input.vaeId, 'vae')
  const embeddingId = addonId(input.embeddingId, 'embeddings')
  const payload = JSON.stringify({ prompt, kind: input.kind, outputDir, fileStem, modelId, aspectRatio, loraId, vaeId, embeddingId })
  const { stdout, stderr, code } = await runPython(pythonBin(), script, modelHome, payload, input.onProgress)
  if (code !== 0) {
    const tail = stderr.trim().split('\n').filter(Boolean).slice(-4).join(' ')
    throw new Error(tail || 'Local generation failed.')
  }
  const line = stdout
    .trim()
    .split('\n')
    .map((entry) => entry.trim())
    .filter((entry) => entry.startsWith('{') && entry.includes('"modelId"'))
    .at(-1)
  if (!line) throw new Error('The local runner did not return a file.')
  const parsed = JSON.parse(line) as { modelId?: string; modelName?: string; kind?: string; filePath?: string; note?: string; checkpoint?: string }
  if (!parsed.modelId || !canRunModel(parsed.modelId) || parsed.modelId !== modelId || typeof parsed.modelName !== 'string') {
    throw new Error('The studio runner reported an unexpected model.')
  }
  if (parsed.kind !== input.kind || typeof parsed.filePath !== 'string') {
    throw new Error('The studio runner did not return a file.')
  }
  const filePath = path.resolve(parsed.filePath)
  const relative = path.relative(outputDir, filePath)
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('The studio runner wrote outside the output folder.')
  const bytes = await fs.readFile(filePath)
  return {
    modelId: parsed.modelId,
    modelName: parsed.modelName,
    kind: input.kind,
    filePath,
    mediaType: input.kind === 'video' ? 'video/mp4' : 'image/png',
    base64: bytes.toString('base64'),
    note: parsed.note,
    checkpoint: parsed.checkpoint,
  }
}

export async function listLibrary(modelHome: string): Promise<LibraryReport> {
  await fs.mkdir(modelHome, { recursive: true })
  const root = repoRoot()
  const script = [
    path.join(process.resourcesPath ?? '', 'runner', 'studio_generate.py'),
    path.join(root, 'runner', 'studio_generate.py'),
  ].find((candidate) => candidate && existsSync(candidate))
  if (!script) throw new Error('This build does not include the local runtime.')
  const { stdout, stderr, code } = await runPython(pythonBin(), script, modelHome, '', undefined, ['--library'], 60_000)
  if (code !== 0) {
    const tail = stderr.trim().split('\n').filter(Boolean).slice(-4).join(' ')
    throw new Error(tail || 'The model library could not be read.')
  }
  const line = stdout
    .trim()
    .split('\n')
    .map((entry) => entry.trim())
    .filter((entry) => entry.startsWith('{') && entry.includes('"folders"'))
    .at(-1)
  if (!line) throw new Error('The model library could not be read.')
  return JSON.parse(line) as LibraryReport
}

function addonId(value: string | undefined, folder: AddonFolder): string {
  const id = value?.trim() ?? ''
  if (!id) return ''
  if (!canAttach(id, folder)) throw new Error(`That file is not a ${folder} weight.`)
  return id
}

function runPython(
  python: string,
  script: string,
  modelHome: string,
  payload: string,
  onProgress?: (progress: LocalProgress) => void,
  args: string[] = [],
  timeoutMs = 60 * 60_000,
): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve, reject) => {
    const child = spawn(python, [script, ...args], {
      shell: false,
      env: {
        ...process.env,
        HIGGSFIELD_MODEL_HOME: modelHome,
        HF_HUB_DISABLE_TELEMETRY: '1',
        HF_HUB_DISABLE_PROGRESS_BARS: '1',
        TOKENIZERS_PARALLELISM: 'false',
        PYTHONUNBUFFERED: '1',
        PYTHONNOUSERSITE: '1',
        OMP_NUM_THREADS: '4',
      },
    })
    let stdout = ''
    let stderr = ''
    let pending = ''
    const timer = setTimeout(() => {
      child.kill()
      reject(new Error('Local generation took too long.'))
    }, timeoutMs)
    child.stdout.on('data', (chunk: Buffer) => {
      const text = chunk.toString()
      stdout += text
      pending += text
      const lines = pending.split('\n')
      pending = lines.pop() ?? ''
      for (const line of lines) {
        const progress = readProgress(line)
        if (progress) onProgress?.(progress)
      }
    })
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })
    child.on('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      const progress = readProgress(pending)
      if (progress) onProgress?.(progress)
      resolve({ stdout, stderr, code: code ?? 1 })
    })
    child.stdin.write(payload)
    child.stdin.end()
  })
}

function readProgress(line: string): LocalProgress | null {
  const trimmed = line.trim()
  if (!trimmed.startsWith('{') || !trimmed.includes('"phase"')) return null
  try {
    const parsed = JSON.parse(trimmed) as LocalProgress
    if ((parsed.phase === 'download' || parsed.phase === 'inspect' || parsed.phase === 'generate') && parsed.detail) {
      return {
        phase: parsed.phase,
        detail: parsed.detail,
        percent: typeof parsed.percent === 'number' ? parsed.percent : undefined,
        bytes: typeof parsed.bytes === 'number' ? parsed.bytes : undefined,
        total: typeof parsed.total === 'number' ? parsed.total : undefined,
        speed: typeof parsed.speed === 'number' ? parsed.speed : undefined,
        eta: typeof parsed.eta === 'number' ? parsed.eta : undefined,
        filename: typeof parsed.filename === 'string' ? parsed.filename : undefined,
        folder: typeof parsed.folder === 'string' ? parsed.folder : undefined,
        status: parsed.status,
      }
    }
  } catch {
    return null
  }
  return null
}
