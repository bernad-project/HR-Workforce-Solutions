import * as React from 'react'
import { cn } from '@/lib/utils'

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'flex w-full rounded-md border border-[var(--color-garis)] bg-white px-3 py-2 text-sm',
        'placeholder:text-[var(--color-redup)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-utama)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}
