import { spawn, type ChildProcess } from 'node:child_process'
import type { WebContents } from 'electron'
import { buildCommand } from '../src/shared/command.ts'
import type { JobDraft } from '../src/shared/types.ts'
import { findHiggsfield, toolchainEnv } from './toolchain.ts'
import { workspaceById } from './workspaces.ts'

let active: ChildProcess | null = null

export async function runJob(
  sender: WebContents,
  workspaceId: string,
  draft: JobDraft,
): Promise<{ runId: string }> {
  const runId = crypto.randomUUID()
  const built = buildCommand(draft)
  if ('error' in built) {
    queueMicrotask(() => sender.send('job-event', { runId, type: 'exit', code: 1, error: built.error }))
    return { runId }
  }
  if (active) {
    queueMicrotask(() =>
      sender.send('job-event', { runId, type: 'exit', code: 1, error: 'A job is already running.' }),
    )
    return { runId }
  }
  const bin = await findHiggsfield()
  if (!bin) {
    queueMicrotask(() =>
      sender.send('job-event', {
        runId,
        type: 'exit',
        code: 1,
        error: 'Install the Higgsfield CLI before running a job.',
      }),
    )
    return { runId }
  }
  const workspace = await workspaceById(workspaceId)
  const child = spawn(bin, built.argv, {
    cwd: workspace.directory,
    env: toolchainEnv(),
    shell: false,
    windowsHide: true,
  })
  active = child
  const push = (text: string) => {
    if (!sender.isDestroyed()) sender.send('job-event', { runId, type: 'log', text })
  }
  child.stdout.on('data', (chunk: Buffer) => push(chunk.toString()))
  child.stderr.on('data', (chunk: Buffer) => push(chunk.toString()))
  child.on('error', (error) => {
    active = null
    if (!sender.isDestroyed()) {
      sender.send('job-event', { runId, type: 'exit', code: 1, error: error.message })
    }
  })
  child.on('close', (code) => {
    active = null
    if (!sender.isDestroyed()) sender.send('job-event', { runId, type: 'exit', code })
  })
  return { runId }
}

export function stopActiveJob(): void {
  active?.kill()
  active = null
}
