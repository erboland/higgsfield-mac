import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { homeForPictures, usableFolder } from '../src/shared/outputFolder.ts'
import { modelEnv, resolveRunnable } from '../src/shared/modelLibrary.ts'
import type { LocalKind } from '../src/shared/localRun.ts'
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
  kind: LocalKind
  directory: string
  modelId?: string
  modelHome?: string
  homeDir?: string
  onProgress?: (progress: LocalProgress) => void
}): Promise<LocalGeneration> {
  const prompt = input.prompt.trim()
  if (!prompt) throw new Error('Write a prompt before a local run.')
  if (input.kind !== 'image' && input.kind !== 'video') {
    throw new Error('Local generation only writes an image or a video.')
  }
  const home = homeForPictures([input.homeDir ?? '', os.homedir()])
  const outputDir = localOutputDir(input.directory, home)
  await fs.mkdir(outputDir, { recursive: true })
  const modelHome = input.modelHome?.trim() || path.join(home, 'Library', 'Application Support', 'Higgsfield', 'models')
  await fs.mkdir(modelHome, { recursive: true })
  const runnable = resolveRunnable(input.modelId, { home, modelHome, env: modelEnv(process.env) })
  if (!runnable) {
    throw new Error('Choose an open checkpoint. Hosted Higgsfield models have no public weights.')
  }
  const root = repoRoot()
  const script = [
    path.join(process.resourcesPath ?? '', 'runner', 'local_generate.py'),
    path.join(root, 'runner', 'local_generate.py'),
  ].find((candidate) => candidate && existsSync(candidate))
  if (!script) throw new Error('This build does not include the local runtime.')
  const fileStem = `local-${Date.now()}`
  const payload = JSON.stringify({
    prompt,
    kind: input.kind,
    outputDir,
    fileStem,
    modelId: runnable.modelId,
    checkpointPath: runnable.checkpointPath,
  })
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
  const parsed = JSON.parse(line) as { modelId?: string; modelName?: string; kind?: string; filePath?: string }
  if (parsed.modelId !== runnable.modelId || parsed.modelName !== runnable.name) {
    throw new Error('The local runner reported an unexpected model.')
  }
  if (parsed.kind !== input.kind || typeof parsed.filePath !== 'string') {
    throw new Error('The local runner did not return a file.')
  }
  const filePath = path.resolve(parsed.filePath)
  const relative = path.relative(outputDir, filePath)
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('The local runner wrote outside the output folder.')
  const bytes = await fs.readFile(filePath)
  return {
    modelId: parsed.modelId,
    modelName: parsed.modelName,
    kind: input.kind,
    filePath,
    mediaType: input.kind === 'video' ? 'video/mp4' : 'image/png',
    base64: bytes.toString('base64'),
  }
}

function runPython(
  python: string,
  script: string,
  modelHome: string,
  payload: string,
  onProgress?: (progress: LocalProgress) => void,
): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve, reject) => {
    const child = spawn(python, [script], {
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
    }, 60 * 60_000)
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
    const parsed = JSON.parse(trimmed) as { phase?: string; detail?: string; percent?: number }
    if ((parsed.phase === 'download' || parsed.phase === 'generate') && parsed.detail) {
      const percent =
        typeof parsed.percent === 'number' && Number.isFinite(parsed.percent)
          ? Math.max(0, Math.min(100, Math.round(parsed.percent)))
          : undefined
      return { phase: parsed.phase, detail: parsed.detail, percent }
    }
  } catch {
    return null
  }
  return null
}
