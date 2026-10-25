import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { BASE_MODEL_ID, CHECKPOINT_FOLDERS, HOSTED_MODELS, MODEL_FOLDERS, OPEN_CHECKPOINTS, type LibraryReport } from '@/shared/studioModels.ts'

const WASH = [
  'bg-[radial-gradient(circle_at_18%_30%,#d1fe17_0%,rgba(209,254,23,0.15)_28%,transparent_52%),linear-gradient(165deg,#1c240c,#0c0e08)]',
  'bg-[radial-gradient(circle_at_80%_20%,#ffffff_0%,rgba(255,255,255,0.12)_22%,transparent_50%),linear-gradient(180deg,#1a1c20,#0c0c0e)]',
  'bg-[radial-gradient(circle_at_40%_80%,#8aa0ff_0%,rgba(120,140,255,0.2)_26%,transparent_55%),linear-gradient(180deg,#141820,#0c0e12)]',
]

function formatBytes(value: number): string {
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(0)} MB`
  return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

type Chip = 'checkpoints' | 'disk' | 'hosted'

export function Models({
  selectedId,
  library,
  libraryError,
  onUse,
}: {
  selectedId: string
  library: LibraryReport | null
  libraryError: string | null
  onUse: (modelId: string) => void
}) {
  const [query, setQuery] = useState('')
  const [chip, setChip] = useState<Chip>('checkpoints')
  const needle = query.trim().toLowerCase()
  const folders = library?.folders ?? MODEL_FOLDERS.map((name) => ({ name, files: [] }))
  const models = library?.models ?? OPEN_CHECKPOINTS.map((model) => ({ ...model, installed: false, runnable: true }))
  const catalogNames = new Set(models.map((model) => `${model.folder}/${model.filename}`))
  const bytesOf = (folder: string, filename: string) => folders.find((entry) => entry.name === folder)?.files.find((file) => file.filename === filename)?.bytes

  const visibleModels = useMemo(
    () =>
      models
        .filter((model) => !needle || `${model.name} ${model.filename}`.toLowerCase().includes(needle))
        .sort((a, b) => Number(b.id === BASE_MODEL_ID) - Number(a.id === BASE_MODEL_ID)),
    [models, needle],
  )
  const diskFiles = useMemo(
    () =>
      folders.flatMap((folder) =>
        folder.files
          .filter((file) => !catalogNames.has(`${folder.name}/${file.filename}`))
          .filter((file) => !needle || `${folder.name} ${file.filename}`.toLowerCase().includes(needle))
          .map((file) => ({ ...file, folder: folder.name })),
      ),
    [folders, needle, catalogNames],
  )
  const hosted = useMemo(() => HOSTED_MODELS.filter((model) => !needle || model.name.toLowerCase().includes(needle)), [needle])
  const emptyFolders = folders.filter((folder) => folder.files.length === 0).map((folder) => folder.name)

  return (
    <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-serif text-2xl tracking-tight">Models</h1>
        <Input value={query} placeholder="Search models" onChange={(event) => setQuery(event.target.value)} className="max-w-xs" />
      </div>
      {libraryError && <p className="mt-3 text-sm text-danger">{libraryError}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        {(
          [
            ['checkpoints', 'Checkpoints'],
            ['disk', 'On disk'],
            ['hosted', 'Hosted'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setChip(id)}
            className={cn('rounded-full px-3 py-1 text-xs', chip === id ? 'bg-accent text-accent-ink' : 'bg-white/5 text-white/70')}
          >
            {label}
          </button>
        ))}
      </div>

      {chip === 'checkpoints' && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleModels.map((model, index) => {
            const bytes = bytesOf(model.folder, model.filename)
            const selected = selectedId === model.id
            return (
              <article key={model.id} className={cn('overflow-hidden rounded-2xl border bg-panel', selected ? 'border-accent' : 'border-white/10')}>
                <div className={cn('h-28', WASH[index % WASH.length])} />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-serif text-xl tracking-tight">{model.name}</h2>
                    <Badge className={model.installed ? 'border-accent/40 text-accent' : ''}>{model.installed ? 'Installed' : 'Download'}</Badge>
                  </div>
                  <p className="mt-2 truncate font-mono text-xs text-muted">
                    {model.folder}/{model.filename}
                    {bytes ? ` · ${formatBytes(bytes)}` : ''}
                  </p>
                  <Button className="mt-4 w-full" variant={selected ? 'default' : 'outline'} onClick={() => onUse(model.id)}>
                    {selected ? 'Selected' : model.installed ? 'Use' : 'Download on Generate'}
                  </Button>
                </div>
              </article>
            )
          })}
          {visibleModels.length === 0 && <p className="text-sm text-muted">No checkpoints match.</p>}
        </div>
      )}

      {chip === 'disk' && (
        <div className="mt-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {diskFiles.map((file) => {
              const runnable = (CHECKPOINT_FOLDERS as readonly string[]).includes(file.folder)
              const selected = selectedId === file.id
              return (
                <article key={file.id} className={cn('rounded-2xl border bg-panel p-4', selected ? 'border-accent' : 'border-white/10')}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm">{file.filename}</p>
                    <Badge>{file.folder}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted">{formatBytes(file.bytes)}</p>
                  {runnable ? (
                    <Button className="mt-4 w-full" size="sm" variant={selected ? 'default' : 'outline'} onClick={() => onUse(file.id)}>
                      {selected ? 'Selected' : 'Use'}
                    </Button>
                  ) : (
                    <p className="mt-4 text-xs text-muted">Attaches to the selected checkpoint</p>
                  )}
                </article>
              )
            })}
          </div>
          {diskFiles.length === 0 && <p className="text-sm text-muted">No extra files on disk.</p>}
          {emptyFolders.length > 0 && <p className="mt-4 text-xs text-muted">Empty folders: {emptyFolders.join(', ')}</p>}
        </div>
      )}

      {chip === 'hosted' && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {hosted.map((model) => (
            <article key={model.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/40 px-4 py-4 opacity-70">
              <div>
                <p className="font-serif text-lg">{model.name}</p>
                <p className="text-xs text-muted">{model.kind === 'video' ? 'Clip' : 'Still'}</p>
              </div>
              <Badge>No download</Badge>
            </article>
          ))}
          {hosted.length === 0 && <p className="text-sm text-muted">No hosted names match.</p>}
        </div>
      )}
    </div>
  )
}
