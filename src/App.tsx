import { useEffect, useMemo, useState } from 'react'
import { DownloadsTray } from '@/components/DownloadsTray'
import { rowFromProgress, type DownloadRow } from '@/shared/downloadRow.ts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getApi } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Models } from '@/screens/Models'
import { Studio } from '@/screens/Studio'
import { Templates } from '@/screens/Templates'
import { BASE_MODEL_ID, canRunModel, type LibraryReport } from '@/shared/studioModels.ts'
import { LOCAL_TEMPLATES, type StudioAspect, type StudioTemplate } from '@/shared/studioTemplates.ts'
import type { AppInfo, LocalGeneration, LocalProgress } from '@/shared/types.ts'

type View = 'create' | 'templates' | 'models'
const STARTER_KEY = 'higgsfield-studio-starter'

function viewFromHash(): View {
  const hash = window.location.hash.replace('#', '')
  if (hash === 'templates' || hash === 'models' || hash === 'create') return hash
  return 'create'
}

export type StudioDraft = {
  templateId: string
  prompt: string
  modelId: string
  loraId: string
  vaeId: string
  embeddingId: string
  kind: 'image' | 'video'
  aspect: StudioAspect
}

export type StudioShot = {
  id: string
  prompt: string
  result: LocalGeneration
}

function starterDraft(): StudioDraft {
  const first = LOCAL_TEMPLATES[0]
  return {
    templateId: first.id,
    prompt: first.prompt,
    modelId: BASE_MODEL_ID,
    loraId: '',
    vaeId: '',
    embeddingId: '',
    kind: first.kind,
    aspect: first.aspect,
  }
}

export function App() {
  const [view, setView] = useState<View>(viewFromHash)
  const [draft, setDraft] = useState<StudioDraft>(starterDraft)
  const [info, setInfo] = useState<AppInfo | null>(null)
  const [starterOpen, setStarterOpen] = useState(() => localStorage.getItem(STARTER_KEY) !== 'done')
  const [downloadsOpen, setDownloadsOpen] = useState(false)
  const [downloadFilter, setDownloadFilter] = useState<'all' | 'active' | 'completed' | 'failed'>('all')
  const [rows, setRows] = useState<DownloadRow[]>([])
  const [progress, setProgress] = useState<LocalProgress | null>(null)
  const [result, setResult] = useState<LocalGeneration | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [shots, setShots] = useState<StudioShot[]>([])
  const [library, setLibrary] = useState<LibraryReport | null>(null)
  const [libraryError, setLibraryError] = useState<string | null>(null)

  useEffect(() => {
    void getApi()
      .getInfo()
      .then(setInfo)
      .catch(() => setInfo({ platform: 'linux', bridge: 'browser' }))
    void getApi()
      .listLibrary()
      .then(setLibrary)
      .catch((caught: unknown) => setLibraryError(caught instanceof Error ? caught.message : 'The model library could not be read.'))
  }, [])

  useEffect(() => {
    return getApi().onLocalProgress((event) => {
      setProgress(event)
      const row = rowFromProgress(event)
      if (!row) return
      setRows((current) => {
        const rest = current.filter((item) => item.id !== row.id)
        return [row, ...rest]
      })
    })
  }, [])

  const activeDownloads = useMemo(() => rows.filter((row) => row.status === 'active').length, [rows])

  function select(next: View) {
    setView(next)
    window.history.replaceState(null, '', `#${next}`)
  }

  function dismissStarter() {
    localStorage.setItem(STARTER_KEY, 'done')
    setStarterOpen(false)
  }

  function useTemplate(entry: StudioTemplate) {
    if (!entry.runnable) return
    setDraft((current) => ({
      ...current,
      templateId: entry.id,
      prompt: entry.prompt,
      modelId: canRunModel(current.modelId) ? current.modelId : BASE_MODEL_ID,
      kind: entry.kind,
      aspect: entry.aspect,
    }))
    setResult(null)
    setError(null)
    dismissStarter()
    select('create')
  }

  function useModel(modelId: string) {
    setDraft((current) => ({ ...current, modelId }))
    dismissStarter()
    select('create')
  }

  async function generate() {
    setBusy(true)
    setError(null)
    setDownloadsOpen(true)
    try {
      const next = await getApi().generateLocal({
        prompt: draft.prompt,
        kind: draft.kind,
        modelId: draft.modelId,
        aspectRatio: draft.aspect,
        loraId: draft.loraId,
        vaeId: draft.vaeId,
        embeddingId: draft.embeddingId,
      })
      setResult(next)
      setShots((current) => [{ id: crypto.randomUUID(), prompt: draft.prompt, result: next }, ...current].slice(0, 12))
      void getApi()
        .listLibrary()
        .then(setLibrary)
        .catch(() => undefined)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Generate failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full flex-col bg-black">
      <header className={cn('drag flex items-center justify-between border-b border-line px-4 py-3', info?.platform === 'darwin' && 'pl-24')}>
        <div className="flex items-center gap-3">
          <span className="h-2.5 w-2.5 rounded-full bg-accent" />
          <span className="font-serif text-lg tracking-tight">Higgsfield</span>
        </div>
        <nav className="no-drag flex items-center gap-1">
          {(
            [
              ['create', 'Create'],
              ['templates', 'Templates'],
              ['models', 'Models'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => select(id)}
              className={cn('rounded-full px-3 py-1.5 text-sm', view === id ? 'bg-panel text-ink' : 'text-white/60 hover:text-ink')}
            >
              {label}
            </button>
          ))}
        </nav>
        <button type="button" className="no-drag relative rounded-full bg-panel px-3 py-1.5 text-sm" onClick={() => setDownloadsOpen(true)}>
          Downloads
          {activeDownloads > 0 && (
            <span className="absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] text-accent-ink">
              {activeDownloads}
            </span>
          )}
        </button>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto">
        {view === 'create' && (
          <Studio
            draft={draft}
            onDraft={setDraft}
            busy={busy}
            progress={progress}
            result={result}
            shots={shots}
            library={library}
            error={error}
            onGenerate={() => void generate()}
          />
        )}
        {view === 'templates' && <Templates onUse={useTemplate} />}
        {view === 'models' && <Models selectedId={draft.modelId} library={library} libraryError={libraryError} onUse={useModel} />}
      </main>
      <DownloadsTray
        open={downloadsOpen}
        rows={rows}
        filter={downloadFilter}
        onFilter={setDownloadFilter}
        onClose={() => setDownloadsOpen(false)}
        onOpen={() => setDownloadsOpen(false)}
        onClearFinished={() => setRows((current) => current.filter((row) => row.status !== 'completed'))}
      />
      {starterOpen && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/80 p-4 sm:items-center">
          <div className="w-full max-w-3xl rounded-3xl border border-line bg-panel p-6">
            <p className="text-[11px] tracking-[0.22em] text-accent uppercase">First open</p>
            <h2 className="mt-2 font-serif text-3xl tracking-tight">Pick a starter</h2>
            <p className="mt-2 max-w-xl text-sm text-muted">
              Templates check the open checkpoint and download it with progress if it is missing. Soul, Kling, Veo, and Seedance stay listed, and they do not download.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {LOCAL_TEMPLATES.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => useTemplate(entry)}
                  className="rounded-2xl border border-line bg-black px-4 py-4 text-left hover:border-accent"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-serif text-lg">{entry.title}</p>
                    <Badge>{entry.kind === 'video' ? 'Clip' : 'Still'}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted">{entry.blurb}</p>
                </button>
              ))}
            </div>
            <div className="mt-5 flex justify-end">
              <Button variant="outline" onClick={dismissStarter}>
                Skip and open Higgsfield
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
