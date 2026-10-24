import type { LocalProgress } from './types.ts'

export type DownloadRow = {
  id: string
  folder: string
  filename: string
  detail: string
  percent: number
  bytes?: number
  total?: number
  speed?: number
  eta?: number
  status: 'active' | 'completed' | 'failed'
}

export function rowFromProgress(progress: LocalProgress): DownloadRow | null {
  if (progress.phase !== 'download') return null
  const filename = progress.filename || 'checkpoint'
  const folder = progress.folder || 'checkpoints'
  const status = progress.status === 'failed' ? 'failed' : progress.status === 'completed' || progress.percent === 100 ? 'completed' : 'active'
  return {
    id: `${folder}/${filename}`,
    folder,
    filename,
    detail: progress.detail,
    percent: progress.percent ?? (status === 'completed' ? 100 : 0),
    bytes: progress.bytes,
    total: progress.total,
    speed: progress.speed,
    eta: progress.eta,
    status,
  }
}
