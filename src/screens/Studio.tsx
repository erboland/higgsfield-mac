import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { getApi } from '@/lib/api'
import {
  aspectRatios,
  marketplaceScopes,
  models,
  photoshootModes,
  skills,
  websiteTemplates,
} from '@/shared/catalog.ts'
import { buildCommand } from '@/shared/command.ts'
import { LOCAL_MODEL_ID, LOCAL_MODEL_NAME } from '@/shared/localRun.ts'
import type { JobDraft, LocalGeneration, SavedJob, Workspace } from '@/shared/types.ts'

const selectClass =
  'h-10 w-full rounded-xl border border-line bg-paper px-3 text-sm text-ink outline-none focus:border-accent'

export function Studio({ draft, onDraft }: { draft: JobDraft; onDraft: (draft: JobDraft) => void }) {
  const api = useMemo(() => getApi(), [])
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [workspaceId, setWorkspaceId] = useState<string>('')
  const [jobs, setJobs] = useState<SavedJob[]>([])
  const [localResult, setLocalResult] = useState<LocalGeneration | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const built = buildCommand(draft)
  const skill = skills.find((item) => item.id === draft.skillId)
  const usesModel =
    draft.skillId === 'higgsfield-generate' ||
    draft.skillId === 'higgsfield-brandkit' ||
    draft.skillId === 'higgsfield-video-explainer' ||
    draft.skillId === 'higgsfield-youtube-thumbnail'
  const model = models.find((item) => item.id === draft.modelId)

  async function refreshWorkspaces(selectId?: string) {
    const next = await api.listWorkspaces()
    setWorkspaces(next)
    setWorkspaceId((current) => selectId || current || next[0]?.id || '')
  }

  useEffect(() => {
    void refreshWorkspaces()
    // The bridge identity is stable for the lifetime of the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!workspaceId) {
      setJobs([])
      return
    }
    void api.listJobs(workspaceId).then(setJobs).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : 'Could not read jobs.')
    })
  }, [api, workspaceId])

  function patch(partial: Partial<JobDraft>) {
    onDraft({ ...draft, ...partial })
    setError('')
  }

  async function onChooseFolder() {
    setError('')
    const directory = await api.pickDirectory()
    if (!directory) return
    const name = directory.split(/[/\\]/).filter(Boolean).at(-1) || 'Output'
    try {
      const created = await api.createWorkspace({ name, directory })
      await refreshWorkspaces(created.id)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not use that folder.')
    }
  }

  async function onSave() {
    if (!workspaceId) {
      setError('Create a workspace before saving.')
      return
    }
    setError('')
    try {
      const job = await api.saveJob(workspaceId, draft)
      setJobs((current) => [job, ...current])
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save the job.')
    }
  }

  async function onGenerate() {
    if (!workspaceId) {
      setError('Choose an output folder first.')
      return
    }
    const prompt = draft.prompt.trim()
    if (!prompt) {
      setError('Write a prompt first.')
      return
    }
    const kind = model?.modality === 'video' ? 'video' : 'image'
    setBusy(true)
    setError('')
    try {
      setLocalResult(await api.generateLocal({ workspaceId, prompt, kind }))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Local generation failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-5 py-6 lg:grid-cols-[280px_1fr]">
      <section className="space-y-4">
        <article className="rounded-2xl border border-line bg-panel p-4">
          <h2 className="font-serif text-xl">Local model</h2>
          <Badge className="mt-3 border-accent text-accent">Installed</Badge>
          <p className="mt-3 text-sm">{LOCAL_MODEL_NAME}</p>
          <p className="mt-1 break-all text-xs text-muted">{LOCAL_MODEL_ID}</p>
          <p className="mt-3 text-sm text-muted">Runs on this machine. The first generate downloads the weights.</p>
        </article>

        <article className="rounded-2xl border border-line bg-panel p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl">Output folder</h2>
            <Button variant="outline" size="sm" onClick={() => void onChooseFolder()}>
              Choose folder
            </Button>
          </div>
          {workspaces.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Choose a folder. Images and videos are saved inside it.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {workspaces.map((workspace) => (
                <li key={workspace.id}>
                  <button
                    type="button"
                    onClick={() => setWorkspaceId(workspace.id)}
                    className={`w-full rounded-xl px-3 py-2 text-left text-sm ${
                      workspace.id === workspaceId ? 'bg-panel-2' : 'hover:bg-white/5'
                    }`}
                  >
                    <span className="block">{workspace.name}</span>
                    <span className="block truncate text-xs text-muted">{workspace.directory}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {workspaceId && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => {
                void api.removeWorkspace(workspaceId).then(() => refreshWorkspaces())
              }}
            >
              Remove from list
            </Button>
          )}
          <p className="mt-3 text-xs text-muted">Removing a workspace leaves the folder on disk.</p>
        </article>

        <article className="rounded-2xl border border-dashed border-line p-4 text-sm text-muted">
          <h2 className="font-serif text-lg text-ink">How a run works</h2>
          <p className="mt-2">
            Generate uses {LOCAL_MODEL_NAME} only. The picture or clip is written under higgsfield-jobs/local in the
            folder you chose.
          </p>
        </article>
      </section>

      <section className="flex flex-col gap-4">
        <header>
          <p className="text-[11px] tracking-[0.22em] text-accent uppercase">Create</p>
          <h1 className="mt-1 font-serif text-4xl tracking-tight">{skill?.title ?? 'Create'}</h1>
          <p className="mt-2 max-w-xl text-sm text-muted">
            {skill?.summary} The prompt runs on {LOCAL_MODEL_NAME}.
          </p>
        </header>

        <article className="rounded-2xl border border-line bg-panel p-4">
          <h2 className="font-serif text-xl">Results</h2>
          {jobs.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Nothing saved in this workspace yet. A finished run prints below.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {jobs.map((job) => (
                <li key={job.id} className="rounded-xl bg-black p-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm">{job.summary}</p>
                    <time className="text-xs text-muted">{new Date(job.createdAt).toLocaleString()}</time>
                  </div>
                  <pre className="mt-2 overflow-x-auto text-xs text-muted whitespace-pre-wrap">{job.display}</pre>
                  <Button variant="ghost" size="sm" className="mt-2" onClick={() => onDraft(job.draft)}>
                    Load
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <h3 className="mt-5 font-serif text-lg">Latest file</h3>
          {localResult ? (
            <figure className="mt-3 overflow-hidden rounded-xl border border-line bg-black">
              {localResult.kind === 'image' ? (
                <img
                  alt=""
                  className="max-h-80 w-full object-contain"
                  src={`data:${localResult.mediaType};base64,${localResult.base64}`}
                />
              ) : (
                <video className="max-h-80 w-full" controls src={`data:${localResult.mediaType};base64,${localResult.base64}`} />
              )}
              <figcaption className="space-y-1 p-3 text-xs text-muted">
                <p className="text-sm text-ink">{localResult.modelName}</p>
                <p className="break-all">{localResult.filePath}</p>
              </figcaption>
            </figure>
          ) : (
            <p className="mt-2 text-sm text-muted">Generate to see the image or video here.</p>
          )}
        </article>

        <div className="sticky bottom-4 z-10 order-last grid gap-3 rounded-2xl border border-white/15 bg-[#131517]/95 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur">
          <label className="space-y-1.5">
            <span className="text-xs tracking-[0.16em] text-muted uppercase">Skill</span>
            <select
              className={selectClass}
              value={draft.skillId}
              onChange={(event) => {
                const skillId = event.target.value as JobDraft['skillId']
                const next = skills.find((item) => item.id === skillId)
                patch({
                  skillId,
                  modelId: next?.defaultModelId ?? draft.modelId,
                })
              }}
            >
              {skills.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-1.5">
            <span className="text-xs tracking-[0.16em] text-muted uppercase">Model</span>
            <p className="text-sm">
              {LOCAL_MODEL_NAME}
              <span className="text-muted"> · {LOCAL_MODEL_ID}</span>
            </p>
          </div>

          {draft.skillId === 'higgsfield-product-photoshoot' && (
            <label className="space-y-1.5">
              <span className="text-xs tracking-[0.16em] text-muted uppercase">Mode</span>
              <select
                className={selectClass}
                value={draft.photoshootMode}
                onChange={(event) => patch({ photoshootMode: event.target.value })}
              >
                {photoshootModes.map((mode) => (
                  <option key={mode.id} value={mode.id}>
                    {mode.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          {draft.skillId === 'higgsfield-marketplace-cards' && (
            <label className="space-y-1.5">
              <span className="text-xs tracking-[0.16em] text-muted uppercase">Scope</span>
              <select
                className={selectClass}
                value={draft.marketplaceScope}
                onChange={(event) => patch({ marketplaceScope: event.target.value })}
              >
                {marketplaceScopes.map((scope) => (
                  <option key={scope.id} value={scope.id}>
                    {scope.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          {draft.skillId === 'higgsfield-soul-id' && (
            <label className="space-y-1.5">
              <span className="text-xs tracking-[0.16em] text-muted uppercase">Character name</span>
              <Input value={draft.characterName} onChange={(event) => patch({ characterName: event.target.value })} />
            </label>
          )}

          {draft.skillId === 'higgsfield-websites' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-xs tracking-[0.16em] text-muted uppercase">Type</span>
                <select
                  className={selectClass}
                  value={draft.websiteType}
                  onChange={(event) => patch({ websiteType: event.target.value as JobDraft['websiteType'] })}
                >
                  <option value="website">Website</option>
                  <option value="app">App</option>
                  <option value="game">Game</option>
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs tracking-[0.16em] text-muted uppercase">Category slug</span>
                <Input value={draft.websiteCategory} onChange={(event) => patch({ websiteCategory: event.target.value })} />
              </label>
              {draft.websiteType === 'app' && (
                <label className="space-y-1.5">
                  <span className="text-xs tracking-[0.16em] text-muted uppercase">Template</span>
                  <select
                    className={selectClass}
                    value={draft.websiteTemplate}
                    onChange={(event) => patch({ websiteTemplate: event.target.value })}
                  >
                    {websiteTemplates.map((template) => (
                      <option key={template} value={template}>
                        {template}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="space-y-1.5">
                <span className="text-xs tracking-[0.16em] text-muted uppercase">Subdomain</span>
                <Input
                  placeholder="optional"
                  value={draft.subdomain}
                  onChange={(event) => patch({ subdomain: event.target.value })}
                />
              </label>
            </div>
          ) : (
            draft.skillId !== 'higgsfield-soul-id' &&
            model?.prompt !== 'unused' && (
              <label className="space-y-1.5">
                <span className="text-xs tracking-[0.16em] text-muted uppercase">Prompt</span>
                <Textarea
                  value={draft.prompt}
                  placeholder="What should this job make?"
                  onChange={(event) => patch({ prompt: event.target.value })}
                />
              </label>
            )
          )}

          {(usesModel && (model?.modality === 'image' || model?.modality === 'video') && model.prompt !== 'unused') ||
          draft.skillId === 'higgsfield-product-photoshoot' ? (
            <label className="space-y-1.5">
              <span className="text-xs tracking-[0.16em] text-muted uppercase">Aspect ratio</span>
              <select
                className={selectClass}
                value={draft.aspectRatio}
                onChange={(event) => patch({ aspectRatio: event.target.value })}
              >
                <option value="">Default</option>
                {aspectRatios.filter(Boolean).map((ratio) => (
                  <option key={ratio} value={ratio}>
                    {ratio}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={'error' in built} onClick={() => void onSave()}>
              Save to workspace
            </Button>
            <Button disabled={busy || !draft.prompt.trim()} onClick={() => void onGenerate()}>
              {busy ? 'Generating…' : 'Generate'}
            </Button>
          </div>
        </div>
      </section>

    </div>
  )
}
