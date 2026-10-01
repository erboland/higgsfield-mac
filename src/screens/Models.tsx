import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { models, workflows } from '@/shared/catalog.ts'
import type { Modality } from '@/shared/types.ts'

const filters: Array<Modality | 'all'> = ['all', 'image', 'video', '3d', 'audio']

export function Models({ onUse }: { onUse: (modelId: string) => void }) {
  const [filter, setFilter] = useState<Modality | 'all'>('all')
  const [query, setQuery] = useState('')

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return models.filter((model) => {
      if (filter !== 'all' && model.modality !== filter) return false
      if (!needle) return true
      return model.name.toLowerCase().includes(needle) || model.id.includes(needle)
    })
  }, [filter, query])

  return (
    <div className="mx-auto max-w-5xl px-5 py-6">
      <h1 className="font-serif text-4xl tracking-tight">Models</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Job types from the public CLI catalog. Names are interface identifiers, copyright 2026 Higgsfield AI. Nothing
        here is a local weight file.
      </p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          value={query}
          placeholder="Search by name or id"
          onChange={(event) => setQuery(event.target.value)}
          className="sm:max-w-xs"
        />
        <div className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <Button
              key={item}
              size="sm"
              variant={filter === item ? 'default' : 'outline'}
              onClick={() => setFilter(item)}
            >
              {item}
            </Button>
          ))}
        </div>
      </div>
      {visible.length === 0 ? (
        <p className="mt-8 text-sm text-muted">No models match that search.</p>
      ) : (
        <ul className="mt-6 divide-y divide-line rounded-2xl border border-line">
          {visible.map((model) => (
            <li key={model.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p>{model.name}</p>
                <p className="text-xs text-muted">{model.id}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge>{model.modality}</Badge>
                <Button size="sm" variant="outline" onClick={() => onUse(model.id)}>
                  Use
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <section className="mt-8">
        <h2 className="font-serif text-2xl">Workflows</h2>
        <p className="mt-2 text-sm text-muted">
          These need a source file and are not in the composer yet. Run them from the CLI with higgsfield generate
          workflow.
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {workflows.map((workflow) => (
            <li key={workflow.id} className="rounded-2xl border border-line p-4">
              <p>{workflow.name}</p>
              <p className="mt-1 text-xs text-muted">{workflow.id}</p>
              <p className="mt-2 text-sm text-muted">{workflow.detail}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
