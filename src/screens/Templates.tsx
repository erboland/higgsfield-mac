import { useMemo, useState } from 'react'
import { LocalRunPanel, useLocalGeneration } from '@/components/LocalRunPanel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { skills } from '@/shared/catalog.ts'
import { demoAsset } from '@/shared/demoAsset.ts'
import {
  templateCategories,
  templates,
  type TemplateCategory,
  type TemplateEntry,
} from '@/shared/starters.ts'

export function Templates({ onStart }: { onStart: (entry: TemplateEntry) => void }) {
  const [category, setCategory] = useState<TemplateCategory | 'all'>('all')
  const [query, setQuery] = useState('')
  const local = useLocalGeneration()

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return templates.filter((entry) => {
      if (category !== 'all' && entry.category !== category) return false
      if (!needle) return true
      const skill = skills.find((item) => item.id === entry.skillId)
      return (
        entry.title.toLowerCase().includes(needle) ||
        entry.blurb.toLowerCase().includes(needle) ||
        (skill?.title.toLowerCase().includes(needle) ?? false)
      )
    })
  }, [category, query])

  return (
    <div className="flex min-h-full flex-col lg:flex-row">
      <aside className="border-b border-line p-4 lg:w-52 lg:shrink-0 lg:border-r lg:border-b-0">
        <p className="px-2 text-[11px] tracking-[0.22em] text-accent uppercase">Start</p>
        <h1 className="mt-1 px-2 font-serif text-2xl tracking-tight">Templates</h1>
        <Input
          value={query}
          placeholder="Search"
          onChange={(event) => setQuery(event.target.value)}
          className="mt-4"
        />
        <div className="mt-4 flex gap-2 overflow-x-auto lg:flex-col">
          {templateCategories.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setCategory(item.id)}
              className={
                category === item.id
                  ? 'rounded-xl bg-panel-2 px-3 py-2 text-left text-sm whitespace-nowrap'
                  : 'rounded-xl px-3 py-2 text-left text-sm whitespace-nowrap text-white/70 hover:bg-white/5 hover:text-white'
              }
            >
              {item.label}
            </button>
          ))}
        </div>
      </aside>

      <div className="min-w-0 flex-1 px-5 py-6">
        <p className="max-w-xl text-sm text-muted">
          Starting points. Generate writes a new image or video with the selected checkpoint into the output folder.
        </p>
        <LocalRunPanel
          workspaces={local.workspaces}
          workspaceId={local.workspaceId}
          onWorkspace={local.setWorkspaceId}
          onCreate={local.createWorkspace}
          result={local.result}
          error={local.error}
          busy={local.busy}
          status={local.status}
          percent={local.percent}
          library={local.library}
        />
        {visible.length === 0 ? (
          <p className="mt-8 text-sm text-muted">No templates match that search.</p>
        ) : (
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((entry) => {
              const skill = skills.find((item) => item.id === entry.skillId)
              const prompt = (entry.patch.prompt || entry.demoPrompt || '').trim()
              const kind = entry.category === 'video' ? 'video' : prompt ? 'image' : null
              return (
                <li key={entry.id}>
                  <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-panel">
                    {entry.category === 'video' ? (
                      <video
                        className="h-40 w-full bg-black object-cover"
                        poster={demoAsset(`${entry.id}.jpg`)}
                        src={demoAsset(`${entry.id}.mp4`)}
                        muted
                        loop
                        playsInline
                        autoPlay
                      />
                    ) : (
                      <img className="h-40 w-full bg-black object-cover" src={demoAsset(`${entry.id}.jpg`)} alt="" />
                    )}
                    <div className="flex flex-1 flex-col p-4">
                      <p className="text-[11px] tracking-[0.16em] text-accent uppercase">{skill?.title}</p>
                      <h2 className="mt-1 font-serif text-xl tracking-tight">{entry.title}</h2>
                      <p className="mt-2 flex-1 text-sm leading-relaxed text-white/70">{entry.blurb}</p>
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => onStart(entry)}>
                          Open
                        </Button>
                        {kind ? (
                          <Button size="sm" disabled={local.busy} onClick={() => void local.generate(prompt, kind)}>
                            Generate
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </article>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
