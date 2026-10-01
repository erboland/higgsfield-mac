import { contextBridge, ipcRenderer } from 'electron'
import type { HiggsfieldApi, JobEvent } from '../src/shared/types.ts'

const api: HiggsfieldApi = {
  getInfo: () => ipcRenderer.invoke('app:info'),
  getToolchain: () => ipcRenderer.invoke('toolchain:get'),
  listWorkspaces: () => ipcRenderer.invoke('workspaces:list'),
  createWorkspace: (input) => ipcRenderer.invoke('workspaces:create', input),
  removeWorkspace: (id) => ipcRenderer.invoke('workspaces:remove', id),
  pickDirectory: () => ipcRenderer.invoke('dialog:directory'),
  listJobs: (workspaceId) => ipcRenderer.invoke('jobs:list', workspaceId),
  saveJob: (workspaceId, draft) => ipcRenderer.invoke('jobs:save', workspaceId, draft),
  runJob: (workspaceId, draft) => ipcRenderer.invoke('jobs:run', workspaceId, draft),
  generateLocal: (input) => ipcRenderer.invoke('local:generate', input),
  onJobEvent: (listener) => {
    const wrapped = (_event: unknown, payload: JobEvent) => listener(payload)
    ipcRenderer.on('job-event', wrapped)
    return () => ipcRenderer.off('job-event', wrapped)
  },
  openExternal: (url) => ipcRenderer.invoke('shell:open', url),
}

contextBridge.exposeInMainWorld('higgsfield', api)
