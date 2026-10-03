import type { AppInfo, HiggsfieldApi, JobDraft, JobEvent, SavedJob, ToolchainStatus, Workspace } from '../shared/types.ts'

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
    async listLocalModels() {
      const response = await fetch('/api/local-models')
      if (!response.ok) throw new Error('Could not read the model library.')
      return response.json() as ReturnType<HiggsfieldApi['listLocalModels']>
    },
    async generateLocal(input) {
      const workspace = load().workspaces.find((item) => item.id === input.workspaceId)
      if (!workspace) throw new Error('Choose a workspace.')
      const response = await fetch('/api/local-generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          prompt: input.prompt,
          kind: input.kind,
          modelId: input.modelId,
          directory: workspace.directory,
        }),
      })
      const body = (await response.json().catch(() => null)) as { error?: string } | null
      if (!response.ok) throw new Error(body?.error || 'Local generation failed.')
      return body as Awaited<ReturnType<HiggsfieldApi['generateLocal']>>
    },
    onLocalProgress() {
      return () => {}
    },
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
