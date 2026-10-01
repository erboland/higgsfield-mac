import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildCommand } from '../src/shared/command.ts'
import type { JobDraft } from '../src/shared/types.ts'
import { generateLocal } from '../runner/generate.ts'
import { runJob, stopActiveJob } from './runner.ts'
import { inspectToolchain } from './toolchain.ts'
import { createWorkspace, listJobs, listWorkspaces, removeWorkspace, saveJob, workspaceById } from './workspaces.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

let win: BrowserWindow | null = null

function createWindow() {
  win = new BrowserWindow({
    width: 1180,
    height: 800,
    minWidth: 880,
    minHeight: 640,
    title: 'Higgsfield',
    backgroundColor: '#10110e',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 16, y: 18 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  win.webContents.on('preload-error', (_event, preloadPath, error) => {
    console.error(`preload failed: ${preloadPath}`, error)
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url)
    return { action: 'deny' }
  })

  if (VITE_DEV_SERVER_URL) void win.loadURL(VITE_DEV_SERVER_URL)
  else void win.loadFile(path.join(RENDERER_DIST, 'index.html'))
}

function isDraft(value: unknown): value is JobDraft {
  if (!value || typeof value !== 'object') return false
  const draft = value as JobDraft
  return typeof draft.skillId === 'string' && typeof draft.modelId === 'string' && typeof draft.prompt === 'string'
}

app.whenReady().then(() => {
  ipcMain.handle('app:info', () => ({ platform: process.platform, bridge: 'desktop' as const }))
  ipcMain.handle('toolchain:get', () => inspectToolchain())
  ipcMain.handle('workspaces:list', () => listWorkspaces())
  ipcMain.handle('workspaces:create', (_event, input: { name: string; directory: string }) => createWorkspace(input))
  ipcMain.handle('workspaces:remove', (_event, id: string) => removeWorkspace(id))
  ipcMain.handle('dialog:directory', async () => {
    const parent = BrowserWindow.getFocusedWindow()
    const result = parent
      ? await dialog.showOpenDialog(parent, { properties: ['openDirectory', 'createDirectory'] })
      : await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] })
    if (result.canceled || !result.filePaths[0]) return null
    return result.filePaths[0]
  })
  ipcMain.handle('jobs:list', (_event, workspaceId: string) => listJobs(workspaceId))
  ipcMain.handle('jobs:save', (_event, workspaceId: string, draft: JobDraft) => {
    if (!isDraft(draft)) throw new Error('Incomplete job.')
    const built = buildCommand(draft)
    if ('error' in built) throw new Error(built.error)
    return saveJob(workspaceId, {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      draft,
      display: built.display,
      summary: built.summary,
    })
  })
  ipcMain.handle(
    'local:generate',
    (_event, input: { workspaceId: string; prompt: string; kind: 'image' | 'video' }) => {
      if (!input || typeof input.workspaceId !== 'string' || typeof input.prompt !== 'string') {
        throw new Error('A local run needs a workspace and a prompt.')
      }
      if (input.kind !== 'image' && input.kind !== 'video') {
        throw new Error('Local generation only writes an image or a video.')
      }
      return workspaceById(input.workspaceId).then((workspace) =>
        generateLocal({ prompt: input.prompt, kind: input.kind, directory: workspace.directory }),
      )
    },
  )
  ipcMain.handle('jobs:run', (event, workspaceId: string, draft: JobDraft) => {
    if (!isDraft(draft)) throw new Error('Incomplete job.')
    return runJob(event.sender, workspaceId, draft)
  })
  ipcMain.handle('shell:open', (_event, url: string) => {
    if (typeof url !== 'string' || !url.startsWith('https://')) return
    return shell.openExternal(url)
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  stopActiveJob()
})
