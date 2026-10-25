import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { getApi } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { StudioDraft, StudioShot } from '@/App'
import {
  BASE_MODEL_ID,
  CHECKPOINT_FOLDERS,
  HOSTED_MODELS,
  OPEN_CHECKPOINTS,
  canRunModel,
  modelChoiceLabel,
  type AddonFolder,
  type LibraryModel,
  type LibraryReport,
} from '@/shared/studioModels.ts'
import { STUDIO_ASPECTS, templateById, type StudioAspect } from '@/shared/studioTemplates.ts'
import type { LocalGeneration, LocalProgress } from '@/shared/types.ts'

const STAGE_WASH: Record<string, string> = {
  'editorial-still': 'bg-[radial-gradient(circle_at_28%_18%,rgba(209,254,23,0.16),transparent_36%),linear-gradient(165deg,#090909,#16130f_58%,#241c16)]',
  'lifestyle-home': 'bg-[radial-gradient(circle_at_70%_80%,rgba(232,180,120,0.28),transparent_42%),linear-gradient(180deg,#100e0c,#2a1c14)]',
  'product-hero': 'bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,0.08),transparent_45%),linear-gradient(180deg,#050505,#141414)]',
  'ugc-review': 'bg-[radial-gradient(circle_at_40%_30%,rgba(196,165,116,0.25),transparent_40%),linear-gradient(200deg,#121820,#3a3428)]',
}

function frameClass(aspect: StudioAspect): string {
  if (aspect === '16:9') return 'aspect-video w-[min(92%,960px)]'
  if (aspect === '4:3') return 'aspect-[4/3] w-[min(88%,860px)]'
  if (aspect === '9:16') return 'aspect-[9/16] h-[calc(100%-2rem)]'
  if (aspect === '3:4') return 'aspect-[3/4] h-[calc(100%-2rem)]'
  return 'aspect-square h-[calc(100%-2rem)]'
}

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
    <label className="text-[11px] tracking-[0.16em] text-muted uppercase">
      {label}
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-full border border-line bg-black px-3 py-2 text-sm text-ink normal-case"
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
  const [modelOpen, setModelOpen] = useState(false)
  const [weightsOpen, setWeightsOpen] = useState(false)
  const models: LibraryModel[] = library?.models ?? OPEN_CHECKPOINTS.map((model) => ({ ...model, installed: false, runnable: true }))
  const ordered = [...models].sort((a, b) => Number(b.id === BASE_MODEL_ID) - Number(a.id === BASE_MODEL_ID))
  const files =
    library?.folders
      .filter((folder) => (CHECKPOINT_FOLDERS as readonly string[]).includes(folder.name))
      .flatMap((folder) => folder.files.map((file) => ({ ...file, folder: folder.name }))) ?? []
  const knownFiles = new Set(models.map((model) => `${model.folder}/${model.filename}`))
  const extraFiles = files.filter((file) => !knownFiles.has(`${file.folder}/${file.filename}`))
  const selected = models.find((model) => model.id === draft.modelId)
  const chip = selected ? selected.name : modelChoiceLabel(draft.modelId)
  const weightCount = [draft.loraId, draft.vaeId, draft.embeddingId].filter(Boolean).length
  const wash = STAGE_WASH[draft.templateId] ?? 'bg-[linear-gradient(180deg,#090909,#141414)]'

  async function copyPrompt(id: string, prompt: string) {
    await navigator.clipboard.writeText(prompt)
    setCopied(id)
  }

  function chooseModel(modelId: string) {
    onDraft({ ...draft, modelId })
    setModelOpen(false)
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <section className="relative min-h-0 flex-1 bg-black">
        {result ? (
          <div className="absolute inset-0 grid place-items-center p-4 pb-24 sm:p-8 sm:pb-24">
            {result.kind === 'video' ? (
              <video className="max-h-full max-w-full rounded-2xl bg-black object-contain" controls src={`data:${result.mediaType};base64,${result.base64}`} />
            ) : (
              <img className="max-h-full max-w-full rounded-2xl bg-black object-contain" alt={draft.prompt} src={`data:${result.mediaType};base64,${result.base64}`} />
            )}
            <p className="absolute bottom-24 left-6 max-w-xl text-sm text-white/70 line-clamp-2">{draft.prompt}</p>
          </div>
        ) : (
          <div className={cn('absolute inset-0', wash)}>
            <div className="absolute inset-0 grid place-items-center p-6">
              <div className={cn('rounded-[28px] border border-white/15', frameClass(draft.aspect))} />
            </div>
            <div className="absolute bottom-6 left-6">
              <p className="text-[11px] tracking-[0.2em] text-white/45 uppercase">{draft.aspect}</p>
              <p className="font-serif text-4xl tracking-tight text-white/90">{template?.title ?? 'Create'}</p>
            </div>
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-black/60">
            <div className="w-72 text-center">
              <p className="font-serif text-3xl tracking-tight">Generating</p>
              <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/10">
                <div className="h-full bg-accent transition-all" style={{ width: `${percent ?? 8}%` }} />
              </div>
              <p className="mt-3 text-sm text-white/70">{progress?.detail || 'Resolving models'}</p>
            </div>
          </div>
        )}
        {error && <p className="absolute top-4 right-4 left-4 z-10 text-sm text-danger">{error}</p>}
        {shots.length > 0 && (
          <ul className="absolute right-3 bottom-3 left-3 z-10 flex gap-2 overflow-x-auto pb-1">
            {shots.map((shot) => (
              <li key={shot.id} className="shrink-0">
                <div className="h-16 w-16 overflow-hidden rounded-xl border border-white/15 bg-panel">
                  {shot.result.kind === 'video' ? (
                    <video className="h-full w-full object-cover" src={`data:${shot.result.mediaType};base64,${shot.result.base64}`} />
                  ) : (
                    <img className="h-full w-full object-cover" alt="" src={`data:${shot.result.mediaType};base64,${shot.result.base64}`} />
                  )}
                </div>
                <div className="mt-1 flex gap-1">
                  <button type="button" className="text-[10px] text-white/60 hover:text-white" onClick={() => void copyPrompt(shot.id, shot.prompt)}>
                    {copied === shot.id ? 'Copied' : 'Copy'}
                  </button>
                  <button type="button" className="text-[10px] text-white/60 hover:text-white" onClick={() => void getApi().openResult(shot.result.filePath)}>
                    Open
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <form
        className="relative z-20 border-t border-white/10 bg-[#0b0c0e] px-3 py-3 sm:px-5"
        onSubmit={(event) => {
          event.preventDefault()
          if (!busy && draft.prompt.trim() && canRunModel(draft.modelId)) onGenerate()
        }}
      >
        {modelOpen && (
          <button type="button" aria-label="Close models" className="fixed inset-0 z-20 cursor-default" onClick={() => setModelOpen(false)} />
        )}
        {modelOpen && (
          <div className="absolute right-3 bottom-full left-3 z-30 mb-2 max-h-80 overflow-y-auto rounded-2xl border border-white/10 bg-[#141618] p-3 shadow-2xl sm:right-5 sm:left-5">
            <p className="px-1 pb-2 text-[11px] tracking-[0.18em] text-muted uppercase">Checkpoints</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {ordered.map((model) => (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => chooseModel(model.id)}
                  className={cn(
                    'rounded-xl border px-3 py-3 text-left',
                    draft.modelId === model.id ? 'border-accent bg-accent/10' : 'border-white/10 bg-black/40 hover:border-white/30',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-serif text-base">{model.name}</span>
                    <Badge className={model.installed ? 'border-accent/40 text-accent' : ''}>{model.installed ? 'Installed' : 'Download'}</Badge>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted">
                    {model.folder}/{model.filename}
                  </p>
                </button>
              ))}
              {extraFiles.map((file) => (
                <button
                  key={file.id}
                  type="button"
                  onClick={() => chooseModel(file.id)}
                  className={cn(
                    'rounded-xl border px-3 py-3 text-left',
                    draft.modelId === file.id ? 'border-accent bg-accent/10' : 'border-white/10 bg-black/40 hover:border-white/30',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm">{file.filename}</span>
                    <Badge className="border-accent/40 text-accent">On disk</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted">{file.folder}</p>
                </button>
              ))}
            </div>
            <p className="mt-3 px-1 text-[11px] tracking-[0.18em] text-muted uppercase">No public weights</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {HOSTED_MODELS.map((model) => (
                <span key={model.id} className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-white/35">
                  {model.name}
                </span>
              ))}
            </div>
          </div>
        )}
        <Textarea
          value={draft.prompt}
          onChange={(event) => onDraft({ ...draft, prompt: event.target.value })}
          className="min-h-12 resize-none border-0 bg-transparent px-1 py-1 text-base shadow-none focus:border-transparent"
          placeholder="Describe your scene"
        />
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {STUDIO_ASPECTS.map((aspect) => (
            <button
              key={aspect}
              type="button"
              onClick={() => onDraft({ ...draft, aspect })}
              className={cn('rounded-full px-3 py-1 text-xs', draft.aspect === aspect ? 'bg-accent text-accent-ink' : 'bg-white/5 text-white/70')}
            >
              {aspect}
            </button>
          ))}
          <button
            type="button"
            aria-label="Model"
            aria-expanded={modelOpen}
            onClick={() => {
              setModelOpen((open) => !open)
              setWeightsOpen(false)
            }}
            className="max-w-[220px] truncate rounded-full bg-white/5 px-3 py-1 text-xs text-white/80"
          >
            {chip}
            {selected && !selected.installed ? ' · download' : ''}
          </button>
          <button
            type="button"
            aria-expanded={weightsOpen}
            onClick={() => {
              setWeightsOpen((open) => !open)
              setModelOpen(false)
            }}
            className={cn('rounded-full px-3 py-1 text-xs', weightsOpen ? 'bg-white text-black' : 'bg-white/5 text-white/70')}
          >
            Weights{weightCount > 0 ? ` · ${weightCount}` : ''}
          </button>
          <Badge className="hidden sm:inline-flex">{draft.kind === 'video' ? 'Clip' : 'Still'}</Badge>
          <Button className="ml-auto" type="submit" size="lg" disabled={busy || !draft.prompt.trim() || !canRunModel(draft.modelId)}>
            {busy ? 'Generating' : 'Generate'}
          </Button>
        </div>
        {weightsOpen && (
          <div className="mt-3 grid gap-3 border-t border-white/10 pt-3 sm:grid-cols-3">
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
        )}
      </form>
    </div>
  )
}
