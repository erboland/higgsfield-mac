import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { getApi } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { StudioDraft, StudioShot } from '@/App'
import { CHECKPOINT_FOLDERS, HOSTED_MODELS, OPEN_CHECKPOINTS, OPEN_MODEL_NOTE, canRunModel, modelChoiceLabel, type AddonFolder, type LibraryReport } from '@/shared/studioModels.ts'
import { STUDIO_ASPECTS, templateById } from '@/shared/studioTemplates.ts'
import type { LocalGeneration, LocalProgress } from '@/shared/types.ts'

function AddonSelect({
  label,
  folder,
  value,
  library,
  onChange,
}: {
  label: string
  folder: AddonFolder
  value: string
  library: LibraryReport | null
  onChange: (id: string) => void
}) {
  const files = library?.folders.find((entry) => entry.name === folder)?.files ?? []
  return (
    <label className="text-xs tracking-wide text-muted uppercase">
      {label}
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-xl border border-line bg-panel px-3 py-2 text-sm text-ink normal-case"
      >
        <option value="">None</option>
        {files.map((file) => (
          <option key={file.id} value={file.id}>
            {file.filename}
          </option>
        ))}
      </select>
    </label>
  )
}

export function Studio({
  draft,
  onDraft,
  busy,
  progress,
  result,
  shots,
  library,
  error,
  onGenerate,
}: {
  draft: StudioDraft
  onDraft: (draft: StudioDraft) => void
  busy: boolean
  progress: LocalProgress | null
  result: LocalGeneration | null
  shots: StudioShot[]
  library: LibraryReport | null
  error: string | null
  onGenerate: () => void
}) {
  const template = templateById(draft.templateId)
  const percent = progress?.percent
  const [copied, setCopied] = useState<string | null>(null)

  async function copyPrompt(id: string, prompt: string) {
    await navigator.clipboard.writeText(prompt)
    setCopied(id)
  }

  return (
    <div className="flex min-h-full flex-col">
      <section className="flex-1 px-4 py-5 sm:px-8">
        <p className="text-[11px] tracking-[0.22em] text-accent uppercase">{template?.group ?? 'Create'}</p>
        <h1 className="mt-2 max-w-xl font-serif text-3xl tracking-tight sm:text-4xl">Generate images and video with Higgsfield models.</h1>
        <p className="mt-2 max-w-xl text-sm text-muted">
          The prompt runs on the checkpoint you select. SDXL Base is the full file. SD Turbo and SDXL Turbo are distilled. Soul, Kling, and Seedance stay in the menu because their weights are not public.
        </p>
        {!result && !error && (
          <div className="mt-6 grid min-h-72 place-items-center rounded-3xl border border-dashed border-line px-6 text-center text-sm text-muted">
            Pick a template or write a prompt, then Generate. The file opens from the gallery.
          </div>
        )}
        {result && (
          <div className="mt-6 overflow-hidden rounded-3xl border border-line bg-panel">
            {result.kind === 'video' ? (
              <video className="max-h-[480px] w-full bg-black object-contain" controls src={`data:${result.mediaType};base64,${result.base64}`} />
            ) : (
              <img className="max-h-[480px] w-full bg-black object-contain" alt={draft.prompt} src={`data:${result.mediaType};base64,${result.base64}`} />
            )}
          </div>
        )}
        {error && <p className="mt-4 text-sm text-danger">{error}</p>}
        {shots.length > 0 && (
          <div className="mt-6">
            <p className="text-[11px] tracking-[0.22em] text-muted uppercase">Gallery</p>
            <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {shots.map((shot) => (
                <li key={shot.id} className="overflow-hidden rounded-2xl border border-line bg-panel">
                  {shot.result.kind === 'video' ? (
                    <video className="aspect-video w-full bg-black object-cover" src={`data:${shot.result.mediaType};base64,${shot.result.base64}`} />
                  ) : (
                    <img className="aspect-square w-full bg-black object-cover" alt="" src={`data:${shot.result.mediaType};base64,${shot.result.base64}`} />
                  )}
                  <div className="flex gap-2 p-2">
                    <Button size="sm" variant="outline" onClick={() => void copyPrompt(shot.id, shot.prompt)}>
                      {copied === shot.id ? 'Copied' : 'Copy prompt'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => void getApi().openResult(shot.result.filePath)}>
                      Open
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
      <form
        className="sticky bottom-0 border-t border-line bg-black/90 px-4 py-3 backdrop-blur sm:px-8"
        onSubmit={(event) => {
          event.preventDefault()
          if (!busy && draft.prompt.trim() && canRunModel(draft.modelId)) onGenerate()
        }}
      >
        <Textarea
          value={draft.prompt}
          onChange={(event) => onDraft({ ...draft, prompt: event.target.value })}
          className="min-h-20 resize-none text-base"
          placeholder="Describe the frame"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {STUDIO_ASPECTS.map((aspect) => (
            <button
              key={aspect}
              type="button"
              onClick={() => onDraft({ ...draft, aspect })}
              className={cn(
                'rounded-full px-3 py-1 text-xs',
                draft.aspect === aspect ? 'bg-accent text-accent-ink' : 'bg-white/5 text-white/70',
              )}
            >
              {aspect}
            </button>
          ))}
          <Badge>{draft.kind === 'video' ? 'Clip' : 'Still'}</Badge>
        </div>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="min-w-0 flex-1 text-xs tracking-wide text-muted uppercase">
            Model
            <select
              value={draft.modelId}
              onChange={(event) => onDraft({ ...draft, modelId: event.target.value })}
              className="mt-1 w-full rounded-xl border border-line bg-panel px-3 py-2 text-sm text-ink normal-case"
            >
              <optgroup label="Open checkpoints">
                {(library?.models ?? OPEN_CHECKPOINTS.map((model) => ({ ...model, installed: false, runnable: true }))).map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                    {model.installed ? '' : ' — download'}
                  </option>
                ))}
                {library?.folders
                  .filter((folder) => (CHECKPOINT_FOLDERS as readonly string[]).includes(folder.name))
                  .flatMap((folder) =>
                    folder.files.map((file) => (
                      <option key={file.id} value={file.id}>
                        {folder.name}/{file.filename}
                      </option>
                    )),
                  )}
              </optgroup>
              <optgroup label="No public weights">
                {HOSTED_MODELS.map((model) => (
                  <option key={model.id} value={model.id} disabled>
                    {model.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>
          <Button type="submit" size="lg" disabled={busy || !draft.prompt.trim() || !canRunModel(draft.modelId)}>
            {busy ? 'Generating' : 'Generate'}
          </Button>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <AddonSelect label="LoRA" folder="loras" value={draft.loraId} library={library} onChange={(loraId) => onDraft({ ...draft, loraId })} />
          <AddonSelect label="VAE" folder="vae" value={draft.vaeId} library={library} onChange={(vaeId) => onDraft({ ...draft, vaeId })} />
          <AddonSelect
            label="Embedding"
            folder="embeddings"
            value={draft.embeddingId}
            library={library}
            onChange={(embeddingId) => onDraft({ ...draft, embeddingId })}
          />
        </div>
        <p className="mt-2 text-xs text-muted">{OPEN_MODEL_NOTE}</p>
        <p className="text-xs text-muted">{modelChoiceLabel(draft.modelId)}</p>
        {busy && (
          <div className="mt-3">
            <div className="h-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-accent transition-all" style={{ width: `${percent ?? 8}%` }} />
            </div>
            <p className="mt-2 text-sm">{progress?.detail || 'Resolving models'}</p>
          </div>
        )}
      </form>
    </div>
  )
}
