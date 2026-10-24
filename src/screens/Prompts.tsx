import { useMemo, useState } from 'react'
import { LocalRunPanel, useLocalGeneration } from '@/components/LocalRunPanel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LOCAL_MODEL_NAME, localMediaKind } from '@/shared/localRun.ts'
import { promptKinds, prompts, type PromptEntry, type PromptKind } from '@/shared/starters.ts'

const kindLabel: Record<PromptKind, string> = {
  image: 'Image',
  video: 'Video',
  product: 'Product',
  audio: 'Audio',
  '3d': '3D',
}

export function Prompts({ onUse }: { onUse: (entry: PromptEntry) => void }) {
  const [kind, setKind] = useState<PromptKind | 'all'>('all')
  const [query, setQuery] = useState('')
  const local = useLocalGeneration()

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return prompts.filter((entry) => {
      if (kind !== 'all' && entry.kind !== kind) return false
      if (!needle) return true
      return (
        entry.title.toLowerCase().includes(needle) ||
        entry.prompt.toLowerCase().includes(needle) ||
        entry.modelId.includes(needle)
      )
    })
  }, [kind, query])

  return (
    <div className="mx-auto max-w-6xl px-5 py-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] tracking-[0.22em] text-accent uppercase">Library</p>
          <h1 className="mt-1 font-serif text-4xl tracking-tight">Prompts</h1>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Starter briefs. Generate runs the prompt on {LOCAL_MODEL_NAME} and saves the file in the output folder.
          </p>
        </div>
        <Input
          value={query}
          placeholder="Search prompts"
          onChange={(event) => setQuery(event.target.value)}
          className="sm:w-64"
        />
      </div>

      <LocalRunPanel
        workspaces={local.workspaces}
        workspaceId={local.workspaceId}
        onWorkspace={local.setWorkspaceId}
        onCreate={local.createWorkspace}
        result={local.result}
        error={local.error}
        busy={local.busy}
        status={local.status}
      />

      <div className="mt-5 flex flex-wrap gap-2">
        <Chip active={kind === 'all'} onClick={() => setKind('all')}>
          All
        </Chip>
        {promptKinds.map((item) => (
          <Chip key={item} active={kind === item} onClick={() => setKind(item)}>
            {kindLabel[item]}
          </Chip>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="mt-10 text-sm text-muted">No prompts match that search.</p>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((entry) => {
            return (
              <li key={entry.id}>
                <article className="flex h-full flex-col rounded-2xl border border-line bg-panel p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] tracking-[0.18em] text-accent uppercase">{kindLabel[entry.kind]}</span>
                    <span className="truncate text-xs text-muted">{LOCAL_MODEL_NAME}</span>
                  </div>
                  <h2 className="mt-3 font-serif text-xl tracking-tight">{entry.title}</h2>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-white/70">{entry.prompt}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => onUse(entry)}>
                      Open
                    </Button>
                    {localMediaKind({ kind: entry.kind, skillId: entry.skillId, prompt: entry.prompt }) ? (
                      <Button
                        size="sm"
                        disabled={local.busy}
                        onClick={() =>
                          void local.generate(
                            entry.prompt,
                            localMediaKind({ kind: entry.kind, skillId: entry.skillId, prompt: entry.prompt })!,
                          )
                        }
                      >
                        Generate
                      </Button>
                    ) : (
                      <p className="text-xs text-muted">This brief is not an image or video.</p>
                    )}
                  </div>
                </article>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? 'rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-accent-ink'
          : 'rounded-full border border-line px-3 py-1.5 text-xs text-white/80 hover:bg-white/5'
      }
    >
      {children}
    </button>
  )
}
