export function RunProgress({
  busy,
  status,
  percent,
}: {
  busy: boolean
  status: string
  percent: number | null
}) {
  if (!busy) return null
  return (
    <div className="mt-4">
      <p className="text-sm">{status || 'Generating'}</p>
      {percent != null ? (
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="h-full bg-accent" style={{ width: `${percent}%` }} />
        </div>
      ) : null}
    </div>
  )
}
