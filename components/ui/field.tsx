import * as React from 'react'
import { cn } from '@/lib/utils'
import { Label } from './label'

/**
 * Satu isian form: label, isi, keterangan bantu, dan pesan galat.
 *
 * Pesan galat datang dari Zod di server, bukan dari pemeriksaan di peramban.
 * Pemeriksaan di peramban hanya mempercepat; yang menentukan tetap server
 * (CLAUDE.md "Konvensi kode").
 */
export function Field({
  htmlFor,
  label,
  bantuan,
  galat,
  wajib,
  className,
  children,
}: {
  htmlFor?: string
  label: string
  bantuan?: React.ReactNode
  galat?: string
  wajib?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {wajib ? <span className="ml-1 text-[var(--color-bahaya)]">*</span> : null}
      </Label>
      {bantuan ? <p className="text-xs text-[var(--color-redup)]">{bantuan}</p> : null}
      {children}
      {galat ? (
        <p className="text-xs text-[var(--color-bahaya)]" role="alert">
          {galat}
        </p>
      ) : null}
    </div>
  )
}

/** Kotak pesan galat yang berlaku untuk seluruh form. */
export function PesanGalat({ pesan }: { pesan: string | null }) {
  if (!pesan) return null
  return (
    <p
      role="alert"
      className="rounded-md bg-[var(--color-bahaya-redup)] px-3 py-2 text-sm text-[var(--color-bahaya)]"
    >
      {pesan}
    </p>
  )
}

/** Kabar baik yang perlu terlihat, untuk aksi yang tidak berpindah halaman. */
export function PesanSukses({ pesan }: { pesan: string | null | undefined }) {
  if (!pesan) return null
  return (
    <p
      role="status"
      className="rounded-md bg-[#dcfce7] px-3 py-2 text-sm text-[var(--color-aman)]"
    >
      {pesan}
    </p>
  )
}
