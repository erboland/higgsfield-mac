import { useMemo, useState, type ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { coverUrl } from '@/shared/coverUrl.ts'
import { HOSTED_TEMPLATES, LATER_TEMPLATES, LOCAL_TEMPLATES, type StudioTemplate } from '@/shared/studioTemplates.ts'

function Cover({ name, className, children }: { name: string; className: string; children: ReactNode }) {
  return (
    <div className={cn('relative overflow-hidden bg-black', className)}>
      <img src={coverUrl(name)} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 to-transparent" />
      {children}
    </div>
  )
}

const FILTERS = ['All', 'Stills', 'Clips', 'Soul', 'Cinema', 'Ads', 'Art', 'Portraits', 'Coming later', 'Hosted'] as const
type Filter = (typeof FILTERS)[number]

function matches(entry: StudioTemplate, needle: string): boolean {
  if (!needle) return true
  const hay = `${entry.title} ${entry.group} ${entry.blurb} ${entry.prompt}`.toLowerCase()
  return hay.includes(needle)
}

function inFilter(entry: StudioTemplate, filter: Filter): boolean {
  if (filter === 'All') return true
  if (filter === 'Stills') return entry.runnable && entry.kind === 'image'
  if (filter === 'Clips') return entry.runnable && entry.kind === 'video'
  return entry.group === filter
}

export function Templates({ onUse }: { onUse: (entry: StudioTemplate) => void }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('All')
  const needle = query.trim().toLowerCase()
  const cards = useMemo(
    () => [...LOCAL_TEMPLATES, ...LATER_TEMPLATES].filter((entry) => matches(entry, needle) && inFilter(entry, filter)),
    [needle, filter],
  )
  const hosted = useMemo(
    () => HOSTED_TEMPLATES.filter((entry) => matches(entry, needle) && inFilter(entry, filter)),
    [needle, filter],
  )

  return (
    <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-serif text-2xl tracking-tight">Templates</h1>
        <Input value={query} placeholder="Search" onChange={(event) => setQuery(event.target.value)} className="max-w-xs" />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((label) => (
          <button
            key={label}
            type="button"
            onClick={() => setFilter(label)}
            className={cn('rounded-full px-3 py-1 text-xs', filter === label ? 'bg-accent text-accent-ink' : 'bg-white/5 text-white/70')}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((entry) => (
          <article key={entry.id} className="overflow-hidden rounded-2xl border border-white/10 bg-panel">
            <Cover name={entry.id} className="flex h-52 items-end p-4">
              <Badge className="absolute top-3 left-3 border-white/20 bg-black/40 text-white">
                {entry.runnable ? (entry.kind === 'video' ? 'Clip' : 'Still') : 'Coming later'}
              </Badge>
              <div className="relative">
                <p className="text-[11px] tracking-[0.18em] text-white/60 uppercase">{entry.aspect}</p>
                <h2 className="font-serif text-2xl tracking-tight">{entry.title}</h2>
              </div>
            </Cover>
            <div className="flex items-center justify-between gap-3 p-3">
              <p className="truncate text-xs text-muted">{entry.blurb}</p>
              <Button size="sm" disabled={!entry.runnable} onClick={() => entry.runnable && onUse(entry)}>
                {entry.runnable ? 'Use' : 'Later'}
              </Button>
            </div>
          </article>
        ))}
        {cards.length === 0 && hosted.length === 0 && <p className="text-sm text-muted">No templates match.</p>}
      </div>
      {hosted.length > 0 && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {hosted.map((entry) => (
            <article key={entry.id} className="overflow-hidden rounded-2xl border border-white/10">
              <Cover name={entry.id} className="flex h-36 items-end p-4">
                <Badge className="absolute top-3 left-3">No public weights</Badge>
                <h2 className="relative font-serif text-xl">{entry.title}</h2>
              </Cover>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
