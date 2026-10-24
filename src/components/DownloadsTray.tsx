import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { DownloadRow } from '@/shared/downloadRow.ts'

export type { DownloadRow }

type Filter = 'all' | 'active' | 'completed' | 'failed'

function formatBytes(value?: number): string {
  if (!value || value < 0) return '0 MB'
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`
  return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

function formatSpeed(value?: number): string {
  if (!value) return '—'
  return `${formatBytes(value)}/s`
}

function formatEta(value?: number): string {
  if (value === undefined || value < 0) return '—'
  if (value < 60) return `${value}s left`
  return `${Math.ceil(value / 60)} min left`
}

export function DownloadsTray({
  open,
  rows,
  filter,
  onFilter,
  onClose,
  onOpen,
  onClearFinished,
}: {
  open: boolean
  rows: DownloadRow[]
  filter: Filter
  onFilter: (filter: Filter) => void
  onClose: () => void
  onOpen: (row: DownloadRow) => void
  onClearFinished: () => void
}) {
  const visible = rows.filter((row) => filter === 'all' || row.status === filter)
  const active = rows.filter((row) => row.status === 'active').length
  const completed = rows.filter((row) => row.status === 'completed').length
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="w-[min(560px,calc(100%-2rem))]">
        <DialogTitle className="font-serif text-xl">Downloads</DialogTitle>
        <p className="mt-1 text-sm text-muted">Checkpoints land in the app model folder. Hosted models are not in this list.</p>
        <div className="mt-4 flex gap-2">
          {(['all', 'active', 'completed', 'failed'] as Filter[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onFilter(item)}
              className={cn(
                'rounded-full px-3 py-1 text-xs capitalize',
                filter === item ? 'bg-accent text-accent-ink' : 'bg-white/5 text-white/70',
              )}
            >
              {item === 'all' ? 'All' : item === 'active' ? 'Active' : item === 'completed' ? 'Completed' : 'Failed'}
            </button>
          ))}
        </div>
        <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
          {visible.length === 0 && <p className="rounded-xl bg-black/40 px-3 py-6 text-sm text-muted">No downloads in this filter.</p>}
          {visible.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => row.status === 'completed' && onOpen(row)}
              className="block w-full rounded-xl bg-black/40 px-3 py-3 text-left"
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="truncate text-sm">
                  <span className="text-muted">{row.folder}/</span>
                  {row.filename}
                </p>
                <span className="text-xs text-accent">{row.percent}%</span>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                <div className="h-full bg-accent" style={{ width: `${Math.max(0, Math.min(100, row.percent))}%` }} />
              </div>
              <p className="mt-2 text-xs text-muted">
                {formatBytes(row.bytes)} / {row.total ? formatBytes(row.total) : '—'} · {formatSpeed(row.speed)} · {formatEta(row.eta)}
              </p>
            </button>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-muted">
          <span>
            {active} active · {completed} completed
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" disabled={completed === 0} onClick={onClearFinished}>
              Clear finished
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
