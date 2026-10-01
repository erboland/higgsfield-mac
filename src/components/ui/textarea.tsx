import * as React from 'react'
import { cn } from '@/lib/utils'

export function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(
        'min-h-28 w-full resize-y rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-accent',
        className,
      )}
      {...props}
    />
  )
}
