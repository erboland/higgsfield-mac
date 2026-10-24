import type { AppInfo, HiggsfieldApi, JobDraft, JobEvent, LocalGeneration, LocalProgress, SavedJob, ToolchainStatus, Workspace } from '../shared/types.ts'

const KEY = 'higgsfield-local-preview'

type Memory = { workspaces: Workspace[]; jobs: Record<string, SavedJob[]> }

function load(): Memory {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { workspaces: [], jobs: {} }
    return JSON.parse(raw) as Memory
  } catch {
    return { workspaces: [], jobs: {} }
  }
}

function save(memory: Memory) {
  localStorage.setItem(KEY, JSON.stringify(memory))
}

const listeners = new Set<(event: JobEvent) => void>()
const progressListeners = new Set<(event: LocalProgress) => void>()

export function createBrowserBridge(): HiggsfieldApi {
  return {
    async getInfo(): Promise<AppInfo> {
      return { platform: navigator.platform.toLowerCase().includes('mac') ? 'darwin' : 'linux', bridge: 'browser' }
    },
    async getToolchain(): Promise<ToolchainStatus> {
      return {
        installed: false,
        path: null,
        version: null,
        detail: 'This browser tab cannot see the CLI. Use the Higgsfield window to run jobs.',
      }
    },
    async listWorkspaces() {
      const memory = load()
      if (memory.workspaces.length > 0) return memory.workspaces
      const workspace: Workspace = {
        id: crypto.randomUUID(),
        name: 'Higgsfield',
        directory: '/tmp/higgsfield-workspace',
        createdAt: new Date().toISOString(),
      }
      memory.workspaces = [workspace]
      memory.jobs[workspace.id] = []
      save(memory)
      return memory.workspaces
    },
    async createWorkspace(input) {
      const name = input.name.trim()
      const directory = input.directory.trim()
      if (!name) throw new Error('Name the workspace.')
      if (!directory) throw new Error('Choose a folder.')
      const workspace: Workspace = {
        id: crypto.randomUUID(),
        name,
        directory,
        createdAt: new Date().toISOString(),
      }
      const memory = load()
      memory.workspaces.unshift(workspace)
      memory.jobs[workspace.id] = []
      save(memory)
      return workspace
    },
    async removeWorkspace(id) {
      const memory = load()
      memory.workspaces = memory.workspaces.filter((workspace) => workspace.id !== id)
      delete memory.jobs[id]
      save(memory)
    },
    async pickDirectory() {
      return null
    },
    async listJobs(workspaceId) {
      return load().jobs[workspaceId] ?? []
    },
    async saveJob(workspaceId, draft: JobDraft) {
      const { buildCommand } = await import('../shared/command.ts')
      const built = buildCommand(draft)
      if ('error' in built) throw new Error(built.error)
      const job: SavedJob = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        draft,
        display: built.display,
        summary: built.summary,
      }
      const memory = load()
      memory.jobs[workspaceId] = [job, ...(memory.jobs[workspaceId] ?? [])]
      save(memory)
      return job
    },
    async listLibrary() {
      const response = await fetch('/api/library')
      if (!response.ok) throw new Error('The model library could not be read.')
      return response.json()
    },
    async generateLocal(input) {
      const workspace = load().workspaces.find((item) => item.id === input.workspaceId)
      const directory = workspace?.directory || '/tmp/higgsfield-studio/Pictures/Higgsfield'
      const response = await fetch('/api/local-generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          prompt: input.prompt,
          kind: input.kind,
          modelId: input.modelId,
          aspectRatio: input.aspectRatio,
          loraId: input.loraId,
          vaeId: input.vaeId,
          embeddingId: input.embeddingId,
          directory,
        }),
      })
      if (!response.ok || !response.body) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error || 'Local generation failed.')
      }
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let pending = ''
      let result: LocalGeneration | null = null
      const take = (line: string) => {
        if (!line.trim()) return
        const parsed = JSON.parse(line) as {
          type?: string
          progress?: LocalProgress
          result?: LocalGeneration
          error?: string
        }
        if (parsed.type === 'progress' && parsed.progress) {
          for (const listener of progressListeners) listener(parsed.progress)
        }
        if (parsed.type === 'error') throw new Error(parsed.error || 'Local generation failed.')
        if (parsed.type === 'result' && parsed.result) result = parsed.result
      }
      while (true) {
        const chunk = await reader.read()
        if (chunk.done) break
        pending += decoder.decode(chunk.value, { stream: true })
        const lines = pending.split('\n')
        pending = lines.pop() ?? ''
        for (const line of lines) take(line)
      }
      if (pending.trim()) take(pending)
      if (!result) throw new Error('Local generation failed.')
      return result
    },
    onLocalProgress(listener) {
      progressListeners.add(listener)
      return () => progressListeners.delete(listener)
    },
    async openResult() {},
    async runJob() {
      const runId = crypto.randomUUID()
      queueMicrotask(() => {
        const event: JobEvent = {
          runId,
          type: 'exit',
          code: 1,
          error: 'Open the Higgsfield app window to run the CLI.',
        }
        for (const listener of listeners) listener(event)
      })
      return { runId }
    },
    onJobEvent(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    async openExternal(url) {
      if (url.startsWith('https://')) window.open(url, '_blank', 'noopener')
    },
  }
}
