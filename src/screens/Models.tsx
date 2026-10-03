import { Button } from '@/components/ui/button'
import { useModelLibrary } from '@/lib/useModelLibrary'
import type { LocalModelChoice } from '@/shared/types.ts'

export function Models({ onUse }: { onUse: (modelId: string) => void }) {
  const library = useModelLibrary()
  const installed = library.models.filter((model) => model.kind !== 'hosted' && model.installed)
  const downloads = library.models.filter((model) => model.kind === 'open' && !model.installed)
  const hosted = library.models.filter((model) => model.kind === 'hosted')
  const checkpoints = installed.filter((model) => model.kind === 'checkpoint')

  return (
    <div className="mx-auto max-w-3xl px-5 py-6">
      <p className="text-[11px] tracking-[0.22em] text-accent uppercase">On this machine</p>
      <h1 className="mt-1 font-serif text-4xl tracking-tight">Models</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Generate uses the checkpoint you select. If it is already here, it runs. If it is missing, Generate downloads it
        and shows that progress first.
      </p>

      {library.loading ? <p className="mt-6 text-sm text-muted">Looking for checkpoints on this machine.</p> : null}
      {library.error ? <p className="mt-6 text-sm text-danger">{library.error}</p> : null}

      {!library.loading && installed.length === 0 ? (
        <p className="mt-6 text-sm text-muted">
          {library.comfyFolders.length > 0
            ? 'A ComfyUI models/checkpoints folder is on this machine, and it has no weight files yet.'
            : 'No ComfyUI models/checkpoints folder was found, and no open checkpoint is installed yet.'}
        </p>
      ) : null}

      {installed.length > 0 ? (
        <section className="mt-6 space-y-3">
          <h2 className="font-serif text-2xl tracking-tight">Installed</h2>
          {installed.map((model) => (
            <ModelCard
              key={model.id}
              model={model}
              selected={library.modelId === model.id}
              action="Use this model"
              onUse={() => {
                library.chooseModel(model.id)
                onUse(model.id)
              }}
            />
          ))}
        </section>
      ) : null}

      {checkpoints.length === 0 && library.comfyFolders.length > 0 && installed.length > 0 ? (
        <p className="mt-4 text-sm text-muted">The ComfyUI checkpoints folder has no weight files yet.</p>
      ) : null}

      <section className="mt-8 space-y-3">
        <h2 className="font-serif text-2xl tracking-tight">Download</h2>
        <p className="text-sm text-muted">
          Open checkpoints. Soul, Kling, and the other hosted Higgsfield models are not in this list.
        </p>
        {downloads.length === 0 ? (
          <p className="text-sm text-muted">Every open checkpoint in this list is already installed.</p>
        ) : (
          downloads.map((model) => (
            <ModelCard
              key={model.id}
              model={model}
              selected={library.modelId === model.id}
              action="Use this model"
              onUse={() => {
                library.chooseModel(model.id)
                onUse(model.id)
              }}
            />
          ))
        )}
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-2xl tracking-tight">No public weights</h2>
        <p className="mt-2 text-sm text-muted">
          These hosted models have no public weights. Generate cannot download them.
        </p>
        <ul className="mt-3 space-y-2">
          {hosted.map((model) => (
            <li key={model.id} className="rounded-xl border border-line px-4 py-3 text-sm">
              <span className="text-ink">{model.name}</span>
              <span className="mt-1 block text-muted">{model.detail}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function ModelCard({
  model,
  selected,
  action,
  onUse,
}: {
  model: LocalModelChoice
  selected: boolean
  action: string
  onUse: () => void
}) {
  return (
    <article className="rounded-2xl border border-line bg-panel p-5">
      <p className="text-[11px] tracking-[0.18em] text-accent uppercase">
        {model.installed ? 'Installed' : 'Not downloaded'}
        {selected ? ' · Selected' : ''}
      </p>
      <h3 className="mt-1 font-serif text-3xl tracking-tight">{model.name}</h3>
      <p className="mt-2 break-all text-sm text-muted">{model.kind === 'checkpoint' ? model.detail : model.id}</p>
      {model.kind !== 'checkpoint' ? <p className="mt-3 text-sm leading-relaxed text-white/80">{model.detail}</p> : null}
      <Button className="mt-5" onClick={onUse}>
        {action}
      </Button>
    </article>
  )
}
