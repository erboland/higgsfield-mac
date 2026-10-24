import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CHECKPOINT_FOLDERS, HOSTED_MODELS, MODEL_FOLDERS, OPEN_CHECKPOINTS, type LibraryReport } from '@/shared/studioModels.ts'

function formatBytes(value: number): string {
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(0)} MB`
  return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

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
  const folders = library?.folders ?? MODEL_FOLDERS.map((name) => ({ name, files: [] }))
  const models = library?.models ?? OPEN_CHECKPOINTS.map((model) => ({ ...model, installed: false, runnable: true }))
  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <p className="text-[11px] tracking-[0.22em] text-accent uppercase">Models</p>
      <h1 className="mt-2 font-serif text-4xl tracking-tight">Local checkpoints</h1>
      <p className="mt-2 text-sm text-muted">
        Checkpoints and diffusion models are the files Generate runs. LoRAs, VAEs, and embeddings in those folders attach to the checkpoint you select. A missing open checkpoint downloads into checkpoints as a .part file, then the finished file replaces it.
      </p>
      {libraryError && <p className="mt-3 text-sm text-danger">{libraryError}</p>}

      <section className="mt-8">
        <h2 className="font-serif text-2xl">Model folders</h2>
        <ul className="mt-3 divide-y divide-white/10 rounded-2xl border border-line">
          {folders.map((folder) => (
            <li key={folder.name} className="px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-sm">{folder.name}</p>
                <Badge>{folder.files.length === 0 ? 'Empty' : `${folder.files.length}`}</Badge>
              </div>
              {folder.files.length > 0 && (
                <ul className="mt-2 space-y-2">
                  {folder.files.map((file) => {
                    const runnable = (CHECKPOINT_FOLDERS as readonly string[]).includes(folder.name)
                    return (
                      <li key={file.id} className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm">{file.filename}</p>
                          <p className="text-xs text-muted">
                            {formatBytes(file.bytes)}
                            {runnable ? '' : ' · attaches to the selected checkpoint'}
                          </p>
                        </div>
                        {runnable && (
                          <Button size="sm" variant={selectedId === file.id ? 'default' : 'outline'} onClick={() => onUse(file.id)}>
                            {selectedId === file.id ? 'Selected' : 'Use'}
                          </Button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-2xl">Open checkpoints</h2>
        <div className="mt-3 space-y-3">
          {models.map((model) => (
            <article key={model.id} className="rounded-2xl border border-line bg-panel p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-serif text-xl">{model.name}</h3>
                  <p className="mt-1 text-xs text-muted">
                    {model.folder}/{model.filename}
                  </p>
                </div>
                <Badge>{model.installed ? 'Installed' : 'Not downloaded'}</Badge>
              </div>
              <p className="mt-3 text-sm text-muted">{model.note}</p>
              <Button className="mt-4" variant={selectedId === model.id ? 'default' : 'outline'} onClick={() => onUse(model.id)}>
                {selectedId === model.id ? 'Selected' : model.installed ? 'Use this model' : 'Download on Generate'}
              </Button>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-2xl">No public weights</h2>
        <ul className="mt-3 divide-y divide-white/10 rounded-2xl border border-line">
          {HOSTED_MODELS.map((model) => (
            <li key={model.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p>{model.name}</p>
                <p className="text-xs text-muted">{model.note}</p>
              </div>
              <Badge>No download</Badge>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
