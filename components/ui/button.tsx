import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const gayaTombol = cva(
  'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' +
    'focus-visible:ring-[var(--color-utama)] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        utama: 'bg-[var(--color-utama)] text-white hover:bg-[#1b3a9c]',
        garis:
          'border border-[var(--color-garis)] bg-white text-[var(--color-tinta)] hover:bg-[var(--color-permukaan)]',
        halus: 'text-[var(--color-redup)] hover:bg-[var(--color-permukaan)] hover:text-[var(--color-tinta)]',
        bahaya: 'bg-[var(--color-bahaya)] text-white hover:bg-[#991b1b]',
      },
      size: {
        sedang: 'h-10 px-4 py-2',
        kecil: 'h-8 px-3 text-xs',
        besar: 'h-11 px-6',
      },
    },
    defaultVariants: { variant: 'utama', size: 'sedang' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof gayaTombol> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(gayaTombol({ variant, size }), className)} {...props} />
}

export { gayaTombol }
