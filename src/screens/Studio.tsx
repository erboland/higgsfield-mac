import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
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
import type { JobDraft, SavedJob, ToolchainStatus, Workspace } from '@/shared/types.ts'

const selectClass =
  'h-10 w-full rounded-xl border border-line bg-paper px-3 text-sm text-ink outline-none focus:border-accent'

export function Studio({ draft, onDraft }: { draft: JobDraft; onDraft: (draft: JobDraft) => void }) {
  const api = useMemo(() => getApi(), [])
  const [toolchain, setToolchain] = useState<ToolchainStatus | null>(null)
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [workspaceId, setWorkspaceId] = useState<string>('')
  const [jobs, setJobs] = useState<SavedJob[]>([])
  const [log, setLog] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [workspaceOpen, setWorkspaceOpen] = useState(false)
  const [workspaceName, setWorkspaceName] = useState('')
  const [workspaceDir, setWorkspaceDir] = useState('')
  const [copied, setCopied] = useState(false)

  const built = buildCommand(draft)
  const skill = skills.find((item) => item.id === draft.skillId)
  const usesModel =
    draft.skillId === 'higgsfield-generate' ||
    draft.skillId === 'higgsfield-brandkit' ||
    draft.skillId === 'higgsfield-video-explainer' ||
    draft.skillId === 'higgsfield-youtube-thumbnail'
  const model = models.find((item) => item.id === draft.modelId)

  async function refreshToolchain() {
    setToolchain(await api.getToolchain())
  }

  async function refreshWorkspaces(selectId?: string) {
    const next = await api.listWorkspaces()
    setWorkspaces(next)
    setWorkspaceId((current) => selectId || current || next[0]?.id || '')
  }

  useEffect(() => {
    void refreshToolchain()
    void refreshWorkspaces()
    const stop = api.onJobEvent((event) => {
      if (event.type === 'log') setLog((current) => `${current}${event.text}`.slice(-20000))
      if (event.type === 'exit') {
        setBusy(false)
        if (event.error) setLog((current) => `${current}${event.error}\n`)
        else setLog((current) => `${current}\nFinished with code ${event.code ?? 'unknown'}.\n`)
      }
    })
    return stop
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

  async function onCreateWorkspace() {
    setError('')
    try {
      const created = await api.createWorkspace({ name: workspaceName, directory: workspaceDir })
      setWorkspaceOpen(false)
      setWorkspaceName('')
      setWorkspaceDir('')
      await refreshWorkspaces(created.id)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not create the workspace.')
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

  async function onRun() {
    if (!workspaceId) {
      setError('Create a workspace before running.')
      return
    }
    setConfirmOpen(false)
    setBusy(true)
    setLog('')
    setError('')
    try {
      await api.runJob(workspaceId, draft)
    } catch (reason) {
      setBusy(false)
      setError(reason instanceof Error ? reason.message : 'Could not start the job.')
    }
  }

  async function copyCommand() {
    if ('error' in built) return
    await navigator.clipboard.writeText(built.display)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-5 py-6 lg:grid-cols-[280px_1fr]">
      <section className="space-y-4">
        <article className="rounded-2xl border border-line bg-panel p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-serif text-xl">CLI</h2>
            <Button variant="ghost" size="sm" onClick={() => void refreshToolchain()}>
              Check
            </Button>
          </div>
          {toolchain == null ? (
            <p className="mt-3 text-sm text-muted">Looking for higgsfield…</p>
          ) : toolchain.installed ? (
            <div className="mt-3 space-y-2 text-sm">
              <Badge className="border-accent text-accent">Installed</Badge>
              <p className="break-all text-muted">{toolchain.path}</p>
              <p>{toolchain.detail}</p>
            </div>
          ) : (
            <div className="mt-3 space-y-3 text-sm text-muted">
              <p>{toolchain.detail}</p>
              <p className="text-ink">On a Mac:</p>
              <code className="block rounded-xl bg-paper p-3 text-xs text-ink">
                brew install higgsfield-ai/tap/higgsfield
              </code>
              <code className="block rounded-xl bg-paper p-3 text-xs text-ink">npm install -g @higgsfield/cli</code>
              <p>Then run higgsfield auth login in Terminal. This app does not ask for the key.</p>
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-line bg-panel p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl">Workspaces</h2>
            <Button variant="outline" size="sm" onClick={() => setWorkspaceOpen(true)}>
              New
            </Button>
          </div>
          {workspaces.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              A workspace is a folder for saved jobs. Add one for each local project you are developing.
            </p>
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
          <h2 className="font-serif text-lg text-ink">Local engine</h2>
          <p className="mt-2">
            Generate on this screen confirms, then calls the higgsfield CLI with your account. Image and video files
            from the open local model are made on Prompts and Templates.
          </p>
        </article>
      </section>

      <section className="flex flex-col gap-4">
        <header>
          <p className="text-[11px] tracking-[0.22em] text-accent uppercase">Create</p>
          <h1 className="mt-1 font-serif text-4xl tracking-tight">{skill?.title ?? 'Create'}</h1>
          <p className="mt-2 max-w-xl text-sm text-muted">
            {skill?.summary} The command is built from the published CLI, then saved under higgsfield-jobs.
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
          <h3 className="mt-5 font-serif text-lg">Output</h3>
          {log ? (
            <pre className="mt-3 max-h-64 overflow-auto text-xs leading-relaxed whitespace-pre-wrap">{log}</pre>
          ) : (
            <p className="mt-2 text-sm text-muted">
              Run output shows up here. A refused or unauthenticated CLI tells you to sign in from Terminal.
            </p>
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

          {usesModel && (
            <label className="space-y-1.5">
              <span className="text-xs tracking-[0.16em] text-muted uppercase">Model</span>
              <select className={selectClass} value={draft.modelId} onChange={(event) => patch({ modelId: event.target.value })}>
                {models.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {item.modality}
                  </option>
                ))}
              </select>
            </label>
          )}

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

          {(draft.skillId === 'higgsfield-soul-id' ||
            draft.skillId === 'higgsfield-product-photoshoot' ||
            draft.skillId === 'higgsfield-marketplace-cards' ||
            (usesModel && model?.media !== 'video')) && (
            <label className="space-y-1.5">
              <span className="text-xs tracking-[0.16em] text-muted uppercase">
                {draft.skillId === 'higgsfield-soul-id' ? 'Photo path' : 'Image path'}
              </span>
              <Input
                placeholder={draft.skillId === 'higgsfield-soul-id' ? 'Path to a photo' : 'Optional reference image'}
                value={draft.imagePath}
                onChange={(event) => patch({ imagePath: event.target.value })}
              />
            </label>
          )}

          {(model?.media === 'video' || model?.id === 'brain_activity') && usesModel && (
            <label className="space-y-1.5">
              <span className="text-xs tracking-[0.16em] text-muted uppercase">Video path</span>
              <Input value={draft.videoPath} onChange={(event) => patch({ videoPath: event.target.value })} />
            </label>
          )}

          <div className="rounded-xl bg-paper p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs tracking-[0.16em] text-muted uppercase">Command</span>
              {'error' in built ? null : (
                <Button variant="ghost" size="sm" onClick={() => void copyCommand()}>
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              )}
            </div>
            {'error' in built ? (
              <p className="text-sm text-muted">{built.error}</p>
            ) : (
              <pre className="overflow-x-auto text-xs leading-relaxed whitespace-pre-wrap">{built.display}</pre>
            )}
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={'error' in built} onClick={() => void onSave()}>
              Save to workspace
            </Button>
            <Button disabled={'error' in built || busy || !toolchain?.installed} onClick={() => setConfirmOpen(true)}>
              {busy ? 'Running…' : 'Generate'}
            </Button>
          </div>
        </div>
      </section>

      <Dialog open={workspaceOpen} onOpenChange={setWorkspaceOpen}>
        <DialogContent>
          <DialogTitle className="font-serif text-2xl">New workspace</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-muted">
            Jobs are written into higgsfield-jobs inside this folder.
          </DialogDescription>
          <div className="mt-4 space-y-3">
            <Input placeholder="Name" value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} />
            <div className="flex gap-2">
              <Input
                placeholder="Folder path"
                value={workspaceDir}
                onChange={(event) => setWorkspaceDir(event.target.value)}
              />
              <Button
                variant="outline"
                onClick={() => {
                  void api.pickDirectory().then((dir) => {
                    if (dir) setWorkspaceDir(dir)
                  })
                }}
              >
                Browse
              </Button>
            </div>
            <Button onClick={() => void onCreateWorkspace()}>Create</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogTitle className="font-serif text-2xl">Run this on your account?</DialogTitle>
          <DialogDescription className="mt-2 text-sm text-muted">
            Higgsfield will call the signed-in CLI. Generation spends credits. Login, if you need it, is higgsfield
            auth login in Terminal.
          </DialogDescription>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => void onRun()}>Run</Button>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
