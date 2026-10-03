import { useEffect, useMemo, useState } from 'react'
import { RunProgress } from '@/components/RunProgress'
import { Button } from '@/components/ui/button'
import { getApi } from '@/lib/api'
import { useModelLibrary } from '@/lib/useModelLibrary'
import type { LocalKind } from '@/shared/localRun.ts'
import type { LocalGeneration, Workspace } from '@/shared/types.ts'

export function useLocalGeneration() {
  const api = useMemo(() => getApi(), [])
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [workspaceId, setWorkspaceId] = useState('')
  const [result, setResult] = useState<LocalGeneration | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [percent, setPercent] = useState<number | null>(null)
  const library = useModelLibrary()

  useEffect(
    () =>
      api.onLocalProgress((event) => {
        setStatus(event.detail)
        setPercent(event.percent ?? null)
      }),
    [api],
  )

  async function refresh() {
    const next = await api.listWorkspaces()
    setWorkspaces(next)
    setWorkspaceId((current) => current || next[0]?.id || '')
  }

  useEffect(() => {
    void refresh()
  }, [])

  async function createWorkspace(name: string, directory: string) {
    try {
      const created = await api.createWorkspace({ name, directory })
      const next = await api.listWorkspaces()
      setWorkspaces(next)
      setWorkspaceId(created.id)
      setError('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not add that folder.')
      throw reason
    }
  }

  async function generate(prompt: string, kind: LocalKind) {
    setBusy(true)
    setPercent(null)
    setStatus(library.selected?.installed ? 'Generating' : 'Downloading the selected model')
    setError('')
    try {
      setResult(await api.generateLocal({ workspaceId, prompt, kind, modelId: library.modelId }))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Local generation failed.')
    } finally {
      setBusy(false)
    }
  }

  return {
    workspaces,
    workspaceId,
    setWorkspaceId,
    createWorkspace,
    result,
    error,
    busy,
    status,
    percent,
    generate,
    library,
  }
}

export function LocalRunPanel({
  workspaces,
  workspaceId,
  onWorkspace,
  onCreate,
  result,
  error,
  busy,
  status,
  percent,
  library,
}: {
  workspaces: Workspace[]
  workspaceId: string
  onWorkspace: (id: string) => void
  onCreate: (name: string, directory: string) => Promise<void>
  result: LocalGeneration | null
  error: string
  busy: boolean
  status: string
  percent: number | null
  library: ReturnType<typeof useModelLibrary>
}) {
  const api = useMemo(() => getApi(), [])
  const selected = workspaces.find((workspace) => workspace.id === workspaceId) ?? workspaces[0]

  async function chooseFolder() {
    const directory = await api.pickDirectory()
    if (!directory) return
    const name = directory.split(/[/\\]/).filter(Boolean).at(-1) || 'Output'
    await onCreate(name, directory)
  }

  return (
    <section className="mt-5 rounded-2xl border border-line bg-panel p-4">
      <p className="text-[11px] tracking-[0.22em] text-accent uppercase">Local model</p>
      <h2 className="mt-1 font-serif text-2xl tracking-tight">{library.selected?.name ?? 'Model'}</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        {library.selected?.installed
          ? 'This checkpoint is already on the machine. Generate runs it.'
          : 'This checkpoint is not on the machine yet. Generate downloads it, shows that progress, then runs it.'}
      </p>
      <label className="mt-4 block text-xs text-muted">
        Model
        <select
          className="mt-1 h-10 w-full rounded-xl border border-line bg-black px-3 text-sm text-ink"
          value={library.modelId}
          onChange={(event) => library.chooseModel(event.target.value)}
        >
          {library.runnable.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name}
              {model.installed ? '' : ' — download on Generate'}
            </option>
          ))}
        </select>
      </label>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        {workspaces.length > 1 ? (
          <label className="block min-w-0 flex-1 text-xs text-muted">
            Output folder
            <select
              className="mt-1 h-10 w-full rounded-xl border border-line bg-black px-3 text-sm text-ink"
              value={workspaceId}
              onChange={(event) => onWorkspace(event.target.value)}
            >
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted">Output folder</p>
            <p className="mt-1 truncate text-sm">{selected?.directory ?? 'A folder is created the first time you generate.'}</p>
          </div>
        )}
        <Button variant="outline" size="sm" onClick={() => void chooseFolder()}>
          Choose folder
        </Button>
      </div>
      {selected && workspaces.length > 1 ? (
        <p className="mt-2 truncate text-xs text-muted">{selected.directory}</p>
      ) : null}
      <RunProgress busy={busy} status={status} percent={percent} />
      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      {result && (
        <figure data-local-run className="mt-4 overflow-hidden rounded-2xl border border-line bg-black">
          {result.kind === 'image' ? (
            <img
              alt=""
              className="max-h-72 w-full object-contain"
              src={`data:${result.mediaType};base64,${result.base64}`}
            />
          ) : (
            <video className="max-h-72 w-full" controls src={`data:${result.mediaType};base64,${result.base64}`} />
          )}
          <figcaption className="space-y-1 p-4 text-sm">
            <p className="font-serif text-xl">{result.modelName}</p>
            <p className="text-muted">{result.modelId}</p>
            <p className="break-all text-xs text-white/70">{result.filePath}</p>
            <p className="text-xs text-muted">Saved from {result.modelName} into the output folder.</p>
          </figcaption>
        </figure>
      )}
    </section>
  )
}
