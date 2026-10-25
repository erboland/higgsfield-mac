import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { HOSTED_TEMPLATES, LOCAL_TEMPLATES, type StudioTemplate } from '@/shared/studioTemplates.ts'

const POSTERS: Record<string, string> = {
  'editorial-still': 'bg-[radial-gradient(circle_at_30%_20%,rgba(209,254,23,0.22),transparent_32%),linear-gradient(160deg,#120e0c,#3a2c24_62%,#1a140f)]',
  'lifestyle-home': 'bg-[radial-gradient(circle_at_72%_78%,rgba(255,196,120,0.45),transparent_40%),linear-gradient(165deg,#1a120e,#6a3b24)]',
  'product-hero': 'bg-[radial-gradient(circle_at_50%_42%,rgba(255,255,255,0.16),transparent_36%),linear-gradient(180deg,#050505,#1b1b1b_70%,#0a0a0a)]',
  'ugc-review': 'bg-[radial-gradient(circle_at_40%_30%,rgba(255,220,170,0.35),transparent_42%),linear-gradient(200deg,#1c2430,#8a7354)]',
  soul: 'bg-[linear-gradient(160deg,#111,#222)]',
  kling: 'bg-[linear-gradient(160deg,#10141c,#1c2433)]',
  genjutsu: 'bg-[linear-gradient(160deg,#140e16,#241828)]',
  seedance: 'bg-[linear-gradient(160deg,#101418,#182028)]',
  veo: 'bg-[linear-gradient(160deg,#101210,#182018)]',
  angles: 'bg-[linear-gradient(160deg,#121212,#1c1c1c)]',
}

type Filter = 'all' | 'still' | 'clip' | 'hosted'

function matches(entry: StudioTemplate, needle: string): boolean {
  if (!needle) return true
  return `${entry.title} ${entry.group} ${entry.prompt}`.toLowerCase().includes(needle)
}

export function Templates({ onUse }: { onUse: (entry: StudioTemplate) => void }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const needle = query.trim().toLowerCase()
  const local = useMemo(() => LOCAL_TEMPLATES.filter((entry) => matches(entry, needle)), [needle])
  const hosted = useMemo(() => HOSTED_TEMPLATES.filter((entry) => matches(entry, needle)), [needle])
  const showLocal = filter === 'all' || filter === 'still' || filter === 'clip'
  const showHosted = filter === 'all' || filter === 'hosted'
  const visibleLocal = local.filter((entry) => filter === 'all' || (filter === 'still' ? entry.kind === 'image' : entry.kind === 'video'))

  return (
    <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-serif text-2xl tracking-tight">Templates</h1>
        <Input value={query} placeholder="Search" onChange={(event) => setQuery(event.target.value)} className="max-w-xs" />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {(
          [
            ['all', 'All'],
            ['still', 'Stills'],
            ['clip', 'Clips'],
            ['hosted', 'Hosted'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={cn('rounded-full px-3 py-1 text-xs', filter === id ? 'bg-accent text-accent-ink' : 'bg-white/5 text-white/70')}
          >
            {label}
          </button>
        ))}
      </div>
      {showLocal && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {visibleLocal.map((entry) => (
            <article key={entry.id} className="overflow-hidden rounded-2xl border border-white/10 bg-panel">
              <div className={cn('relative flex h-52 items-end p-4', POSTERS[entry.id])}>
                <Badge className="absolute top-3 left-3 border-white/20 bg-black/40 text-white">{entry.kind === 'video' ? 'Clip' : 'Still'}</Badge>
                <div>
                  <p className="text-[11px] tracking-[0.18em] text-white/60 uppercase">{entry.aspect}</p>
                  <h2 className="font-serif text-2xl tracking-tight">{entry.title}</h2>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 p-3">
                <p className="truncate text-xs text-muted">{entry.group}</p>
                <Button size="sm" onClick={() => onUse(entry)}>
                  Use
                </Button>
              </div>
            </article>
          ))}
          {visibleLocal.length === 0 && <p className="text-sm text-muted">No templates match.</p>}
        </div>
      )}
      {showHosted && hosted.length > 0 && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {hosted.map((entry) => (
            <article key={entry.id} className="overflow-hidden rounded-2xl border border-white/10 opacity-60">
              <div className={cn('relative flex h-36 items-end p-4', POSTERS[entry.id] ?? 'bg-panel')}>
                <Badge className="absolute top-3 left-3">No public weights</Badge>
                <h2 className="font-serif text-xl">{entry.title}</h2>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
