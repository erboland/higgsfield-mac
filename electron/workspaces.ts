import { app } from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { SavedJob, Workspace } from '../src/shared/types.ts'

type Store = { workspaces: Workspace[] }

function storePath(): string {
  return path.join(app.getPath('userData'), 'workspaces.json')
}

async function readStore(): Promise<Store> {
  try {
    const raw = await fs.readFile(storePath(), 'utf8')
    const parsed = JSON.parse(raw) as Store
    if (!parsed || !Array.isArray(parsed.workspaces)) return { workspaces: [] }
    return parsed
  } catch {
    return { workspaces: [] }
  }
}

async function writeStore(store: Store): Promise<void> {
  await fs.mkdir(path.dirname(storePath()), { recursive: true })
  await fs.writeFile(storePath(), JSON.stringify(store, null, 2))
}

export async function listWorkspaces(): Promise<Workspace[]> {
  const store = await readStore()
  return store.workspaces
}

export async function createWorkspace(input: { name: string; directory: string }): Promise<Workspace> {
  const name = input.name.trim()
  if (!name || name.length > 80 || /[\r\n\0]/.test(name)) {
    throw new Error('Workspace name needs 1–80 characters.')
  }
  const directory = path.resolve(input.directory.trim())
  const stat = await fs.stat(directory).catch(() => null)
  if (!stat?.isDirectory()) throw new Error('Pick a folder that already exists.')
  const workspace: Workspace = {
    id: crypto.randomUUID(),
    name,
    directory,
    createdAt: new Date().toISOString(),
  }
  const store = await readStore()
  store.workspaces.unshift(workspace)
  await writeStore(store)
  await fs.mkdir(path.join(directory, 'higgsfield-jobs'), { recursive: true })
  return workspace
}

export async function removeWorkspace(id: string): Promise<void> {
  const store = await readStore()
  store.workspaces = store.workspaces.filter((workspace) => workspace.id !== id)
  await writeStore(store)
}

export async function workspaceById(id: string): Promise<Workspace> {
  const store = await readStore()
  const workspace = store.workspaces.find((item) => item.id === id)
  if (!workspace) throw new Error('That workspace is gone.')
  return workspace
}

function jobsDir(workspace: Workspace): string {
  return path.join(workspace.directory, 'higgsfield-jobs')
}

export async function listJobs(workspaceId: string): Promise<SavedJob[]> {
  const workspace = await workspaceById(workspaceId)
  const dir = jobsDir(workspace)
  let names: string[] = []
  try {
    names = await fs.readdir(dir)
  } catch {
    return []
  }
  const jobs: SavedJob[] = []
  for (const name of names) {
    if (!name.endsWith('.json')) continue
    try {
      const raw = await fs.readFile(path.join(dir, name), 'utf8')
      jobs.push(JSON.parse(raw) as SavedJob)
    } catch {
      // skip unreadable drafts
    }
  }
  jobs.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return jobs
}

export async function saveJob(workspaceId: string, job: SavedJob): Promise<SavedJob> {
  if (!/^[0-9a-f-]{36}$/i.test(job.id)) throw new Error('Bad job id.')
  const workspace = await workspaceById(workspaceId)
  const dir = jobsDir(workspace)
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(path.join(dir, `${job.id}.json`), JSON.stringify(job, null, 2))
  await fs.writeFile(path.join(dir, `${job.id}.command.txt`), `${job.display}\n`)
  return job
}
