import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { LOCAL_MODEL_ID, LOCAL_MODEL_NAME, type LocalKind } from '../src/shared/localRun.ts'
import type { LocalGeneration } from '../src/shared/types.ts'

function repoRoot(): string {
  if (process.env.HIGGSFIELD_ROOT) return process.env.HIGGSFIELD_ROOT
  if (process.env.APP_ROOT) return process.env.APP_ROOT
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
}

export function localOutputDir(directory: string): string {
  const resolved = path.resolve(directory.trim())
  const rootPath = path.parse(resolved).root
  if (!resolved || resolved === rootPath) throw new Error('Pick a project folder.')
  return path.join(resolved, 'higgsfield-jobs', 'local')
}

export async function generateLocal(input: {
  prompt: string
  kind: LocalKind
  directory: string
}): Promise<LocalGeneration> {
  const prompt = input.prompt.trim()
  if (!prompt) throw new Error('Write a prompt before a local run.')
  if (input.kind !== 'image' && input.kind !== 'video') {
    throw new Error('Local generation only writes an image or a video.')
  }
  const root = repoRoot()
  const python = path.join(root, 'runner', '.venv', 'bin', 'python')
  const script = path.join(root, 'runner', 'local_generate.py')
  try {
    await fs.access(python)
  } catch {
    throw new Error('The local model runtime is missing. From the repo, run: python3 -m venv runner/.venv && runner/.venv/bin/pip install -r runner/requirements.txt')
  }
  const outputDir = localOutputDir(input.directory)
  await fs.mkdir(outputDir, { recursive: true })
  const fileStem = `local-${Date.now()}`
  const payload = JSON.stringify({ prompt, kind: input.kind, outputDir, fileStem })
  const { stdout, stderr, code } = await runPython(
    python,
    script,
    root,
    payload,
    input.kind === 'video' ? 12 * 60_000 : 6 * 60_000,
  )
  if (code !== 0) {
    const tail = stderr.trim().split('\n').slice(-4).join(' ')
    throw new Error(tail || 'Local generation failed.')
  }
  const line = stdout.trim().split('\n').filter(Boolean).at(-1) ?? ''
  const parsed = JSON.parse(line) as { modelId?: string; modelName?: string; kind?: string; filePath?: string }
  if (parsed.modelId !== LOCAL_MODEL_ID || parsed.modelName !== LOCAL_MODEL_NAME) {
    throw new Error('The local runner reported an unexpected model.')
  }
  if (parsed.kind !== input.kind || typeof parsed.filePath !== 'string') {
    throw new Error('The local runner did not return a file.')
  }
  const filePath = path.resolve(parsed.filePath)
  if (!filePath.startsWith(`${outputDir}${path.sep}`)) throw new Error('The local runner wrote outside the workspace.')
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
  root: string,
  payload: string,
  timeoutMs: number,
): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve, reject) => {
    const child = spawn(python, [script], {
      cwd: root,
      shell: false,
      env: {
        ...process.env,
        HF_HOME: path.join(root, 'runner', '.cache'),
        HF_HUB_DISABLE_PROGRESS_BARS: '1',
        TOKENIZERS_PARALLELISM: 'false',
        OMP_NUM_THREADS: '4',
      },
    })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill()
      reject(new Error('Local generation took too long.'))
    }, timeoutMs)
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString()
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
      resolve({ stdout, stderr, code: code ?? 1 })
    })
    child.stdin.write(payload)
    child.stdin.end()
  })
}
