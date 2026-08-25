import * as React from 'react'
import { cn } from '@/lib/utils'

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'flex h-10 w-full rounded-md border border-[var(--color-garis)] bg-white px-3 py-2 text-sm',
        'placeholder:text-[var(--color-redup)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-utama)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}
