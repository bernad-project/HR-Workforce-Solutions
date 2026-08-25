'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Isian rupiah yang menaruh titik pemisah ribuan sambil diketik.
 *
 * Pengelompokan angka dilakukan pada TEKS, bukan lewat `Number` — nilai yang
 * diketik tidak pernah berubah bentuk jadi bilangan pecahan di sisi peramban.
 * Yang dikirim ke server tetap teks, dan server yang mengubahnya jadi `bigint`
 * (CLAUDE.md "Uang").
 */
function kelompokkan(teks: string): string {
  const angka = teks.replace(/\D/g, '').replace(/^0+(?=\d)/, '')
  if (angka === '') return ''
  return angka.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export function InputRupiah({
  className,
  defaultValue,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'defaultValue' | 'value' | 'onChange'> & {
  defaultValue?: string | null
}) {
  const [nilai, setNilai] = React.useState(() => kelompokkan(defaultValue ?? ''))

  return (
    <div className="relative">
      <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm text-[var(--color-redup)]">
        Rp
      </span>
      <input
        {...props}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={nilai}
        onChange={(e) => setNilai(kelompokkan(e.currentTarget.value))}
        className={cn(
          'angka flex h-10 w-full rounded-md border border-[var(--color-garis)] bg-white',
          'py-2 pr-3 pl-9 text-sm',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-utama)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
      />
    </div>
  )
}
