import * as React from 'react'
import { cn } from '@/lib/utils'

export function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'h-10 w-full rounded-xl border border-line bg-paper px-3 text-sm text-ink outline-none placeholder:text-muted focus:border-accent',
        className,
      )}
      {...props}
    />
  )
}
