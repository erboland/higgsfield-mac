import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { HOSTED_TEMPLATES, LOCAL_TEMPLATES, type StudioTemplate } from '@/shared/studioTemplates.ts'

export function Templates({ onUse }: { onUse: (entry: StudioTemplate) => void }) {
  const [query, setQuery] = useState('')
  const needle = query.trim().toLowerCase()
  const local = useMemo(
    () => LOCAL_TEMPLATES.filter((entry) => !needle || `${entry.title} ${entry.blurb} ${entry.prompt}`.toLowerCase().includes(needle)),
    [needle],
  )
  const hosted = useMemo(
    () => HOSTED_TEMPLATES.filter((entry) => !needle || `${entry.title} ${entry.blurb}`.toLowerCase().includes(needle)),
    [needle],
  )
  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <p className="text-[11px] tracking-[0.22em] text-accent uppercase">Templates</p>
      <h1 className="mt-2 font-serif text-4xl tracking-tight">Start from a look</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Text to Image and Text to Video presets fill the prompt, the aspect, and the open checkpoint. If that checkpoint is missing, Generate resolves it and shows the download. Hosted names stay on higgsfield.ai.
      </p>
      <Input value={query} placeholder="Search templates" onChange={(event) => setQuery(event.target.value)} className="mt-5 max-w-sm" />
      <h2 className="mt-8 font-serif text-2xl">On this Mac</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {local.map((entry) => (
          <article key={entry.id} className="rounded-2xl border border-line bg-panel p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-serif text-xl">{entry.title}</h3>
              <Badge>{entry.kind === 'video' ? 'Clip' : 'Still'}</Badge>
            </div>
            <p className="mt-2 text-sm text-muted">{entry.blurb}</p>
            <p className="mt-3 line-clamp-3 text-sm">{entry.prompt}</p>
            <Button className="mt-4" onClick={() => onUse(entry)}>
              Use template
            </Button>
          </article>
        ))}
        {local.length === 0 && <p className="text-sm text-muted">No local templates match.</p>}
      </div>
      <h2 className="mt-10 font-serif text-2xl">No public weights</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {hosted.map((entry) => (
          <article key={entry.id} className="rounded-2xl border border-line bg-black p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-serif text-lg">{entry.title}</h3>
              <Badge>Hosted</Badge>
            </div>
            <p className="mt-2 text-sm text-muted">{entry.blurb}</p>
            <Button className="mt-4" variant="outline" disabled>
              No public weights
            </Button>
          </article>
        ))}
      </div>
    </div>
  )
}
