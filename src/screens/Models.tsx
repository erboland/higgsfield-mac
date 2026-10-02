import { Button } from '@/components/ui/button'
import { LOCAL_MODEL_ID, LOCAL_MODEL_NAME } from '@/shared/localRun.ts'

export function Models({ onUse }: { onUse: (modelId: string) => void }) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-6">
      <p className="text-[11px] tracking-[0.22em] text-accent uppercase">On this machine</p>
      <h1 className="mt-1 font-serif text-4xl tracking-tight">Models</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Generation uses the open model installed for this app. Weights download into the app cache the first time you
        run a prompt, then stay on disk.
      </p>
      <article className="mt-6 rounded-2xl border border-line bg-panel p-5">
        <p className="text-[11px] tracking-[0.18em] text-accent uppercase">Installed</p>
        <h2 className="mt-1 font-serif text-3xl tracking-tight">{LOCAL_MODEL_NAME}</h2>
        <p className="mt-2 text-sm text-muted">{LOCAL_MODEL_ID}</p>
        <p className="mt-4 text-sm leading-relaxed text-white/80">
          Image prompts save a PNG. Video prompts save a short MP4 made from frames of the same model, plus a poster.
          Files go in Pictures/Higgsfield.
        </p>
        <Button className="mt-5" onClick={() => onUse(LOCAL_MODEL_ID)}>
          Use this model
        </Button>
      </article>
    </div>
  )
}
