import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { getApi } from '@/lib/api'
import { cn } from '@/lib/utils'
import { emptyDraft } from '@/shared/catalog.ts'
import type { PromptEntry, TemplateEntry } from '@/shared/starters.ts'
import type { AppInfo, JobDraft } from '@/shared/types.ts'
import { Licenses } from './screens/Licenses'
import { Models } from './screens/Models'
import { Prompts } from './screens/Prompts'
import { Studio } from './screens/Studio'
import { Templates } from './screens/Templates'

type View = 'prompts' | 'create' | 'templates' | 'models' | 'licenses'

function viewFromHash(): View {
  const hash = window.location.hash.replace('#', '')
  if (hash === 'create' || hash === 'templates' || hash === 'models' || hash === 'licenses' || hash === 'prompts') {
    return hash
  }
  return 'prompts'
}

const nav: { id: View; label: string }[] = [
  { id: 'prompts', label: 'Prompts' },
  { id: 'create', label: 'Create' },
  { id: 'templates', label: 'Templates' },
  { id: 'models', label: 'Models' },
  { id: 'licenses', label: 'Licenses' },
]

export function App() {
  const [view, setView] = useState<View>(viewFromHash)
  const [draft, setDraft] = useState<JobDraft>(() => emptyDraft())
  const [info, setInfo] = useState<AppInfo | null>(null)

  useEffect(() => {
    void getApi()
      .getInfo()
      .then(setInfo)
      .catch(() => setInfo({ platform: 'linux', bridge: 'browser' }))
  }, [])

  function select(next: View) {
    setView(next)
    window.history.replaceState(null, '', `#${next}`)
  }

  function openCreate(next: JobDraft) {
    setDraft(next)
    select('create')
  }

  function useModel(modelId: string) {
    openCreate({ ...emptyDraft('higgsfield-generate'), modelId })
  }

  function usePrompt(entry: PromptEntry) {
    const next = emptyDraft(entry.skillId)
    openCreate({
      ...next,
      modelId: entry.modelId || next.modelId,
      prompt: entry.prompt,
      photoshootMode: entry.photoshootMode ?? next.photoshootMode,
      marketplaceScope: entry.marketplaceScope ?? next.marketplaceScope,
    })
  }

  function startTemplate(entry: TemplateEntry) {
    openCreate({ ...emptyDraft(entry.skillId), ...entry.patch })
  }

  return (
    <div className="grid h-full grid-cols-[220px_1fr] max-[860px]:grid-cols-1 max-[860px]:grid-rows-[auto_1fr]">
      <aside className="flex flex-col border-r border-line bg-black max-[860px]:border-r-0 max-[860px]:border-b">
        <div className={cn('drag px-5 pt-5 pb-6 max-[860px]:pt-4 max-[860px]:pb-2', info?.platform === 'darwin' && 'pt-8')}>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-accent" />
            <span className="font-serif text-xl tracking-tight">Higgsfield</span>
          </div>
        </div>
        <nav className="no-drag flex flex-1 flex-col gap-1 px-3 max-[860px]:flex-none max-[860px]:flex-row max-[860px]:flex-wrap max-[860px]:px-4 max-[860px]:pb-3">
          {nav.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => select(item.id)}
              className={cn(
                'rounded-xl px-3 py-2 text-left text-sm',
                view === item.id ? 'bg-panel text-ink' : 'text-white/65 hover:bg-white/5 hover:text-ink',
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="no-drag px-5 py-4 max-[860px]:hidden">
          <Badge>{info?.bridge === 'desktop' ? 'Mac app' : 'Browser preview'}</Badge>
        </div>
      </aside>
      <main className="min-h-0 overflow-y-auto bg-black">
        {view === 'prompts' && <Prompts onUse={usePrompt} />}
        {view === 'create' && <Studio draft={draft} onDraft={setDraft} />}
        {view === 'templates' && <Templates onStart={startTemplate} />}
        {view === 'models' && <Models onUse={useModel} />}
        {view === 'licenses' && <Licenses />}
      </main>
    </div>
  )
}
