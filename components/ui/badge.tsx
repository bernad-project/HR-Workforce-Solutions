import * as React from 'react'
import { cn } from '@/lib/utils'

const NADA: Record<string, string> = {
  netral: 'bg-[var(--color-permukaan)] text-[var(--color-redup)] border-[var(--color-garis)]',
  utama: 'bg-[var(--color-utama-redup)] text-[var(--color-utama)] border-transparent',
  aman: 'bg-[#dcfce7] text-[var(--color-aman)] border-transparent',
  bahaya: 'bg-[var(--color-bahaya-redup)] text-[var(--color-bahaya)] border-transparent',
  hangat: 'bg-[#fef3c7] text-[#92400e] border-transparent',
}

export type NadaBadge = keyof typeof NADA

export function Badge({
  nada = 'netral',
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { nada?: NadaBadge }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        NADA[nada],
        className,
      )}
      {...props}
    />
  )
}
