import type { ComponentProps } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

export function DialogContent({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/60" />
      <DialogPrimitive.Content
        className={cn(
          'fixed top-1/2 left-1/2 z-50 w-[min(440px,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-line bg-panel p-5 text-ink shadow-2xl',
          className,
        )}
        {...props}
      />
    </DialogPrimitive.Portal>
  )
}

export const DialogTitle = DialogPrimitive.Title
export const DialogDescription = DialogPrimitive.Description
