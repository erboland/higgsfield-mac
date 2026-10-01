import { Button } from '@/components/ui/button'
import { skills } from '@/shared/catalog.ts'
import type { SkillId } from '@/shared/types.ts'
import { getApi } from '@/lib/api'

export function Skills({ onUse }: { onUse: (skillId: SkillId) => void }) {
  return (
    <div className="mx-auto max-w-5xl px-5 py-6">
      <h1 className="font-serif text-4xl tracking-tight">Skills</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Eight procedures from the public skills repository. Each one drives the CLI. The source Markdown stays
        upstream; this list is the local index.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {skills.map((skill) => (
          <article key={skill.id} className="flex flex-col rounded-2xl border border-line bg-panel p-4">
            <h2 className="font-serif text-2xl">{skill.title}</h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{skill.summary}</p>
            <p className="mt-3 text-sm">{skill.chains}</p>
            <code className="mt-3 block text-xs text-ink">{skill.command}</code>
            <div className="mt-4 flex gap-2">
              <Button size="sm" onClick={() => onUse(skill.id)}>
                Use in studio
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void getApi().openExternal(skill.upstream)}
              >
                Upstream
              </Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
