import { cn } from '@/lib/utils'

export function Badge({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-line px-2 py-0.5 text-[11px] uppercase tracking-[0.14em] text-muted',
        className,
      )}
      {...props}
    />
  )
}
