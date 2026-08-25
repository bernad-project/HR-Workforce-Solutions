import * as React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export function JudulHalaman({
  judul,
  keterangan,
  kembali,
  aksi,
}: {
  judul: string
  keterangan?: React.ReactNode
  kembali?: { href: string; label: string }
  aksi?: React.ReactNode
}) {
  return (
    <div className="mb-6">
      {kembali ? (
        <Link
          href={kembali.href}
          className="mb-2 inline-block text-sm text-[var(--color-utama)] hover:underline"
        >
          ← {kembali.label}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{judul}</h1>
          {keterangan ? (
            <div className="mt-1 text-sm text-[var(--color-redup)]">{keterangan}</div>
          ) : null}
        </div>
        {aksi ? <div className="flex shrink-0 gap-2">{aksi}</div> : null}
      </div>
    </div>
  )
}

/** Keadaan kosong yang menjelaskan langkah berikutnya, bukan sekadar "tidak ada data". */
export function Kosong({
  judul,
  keterangan,
  aksi,
}: {
  judul: string
  keterangan?: string
  aksi?: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-dashed border-[var(--color-garis)] bg-white px-6 py-12 text-center">
      <p className="text-sm font-medium">{judul}</p>
      {keterangan ? (
        <p className="mx-auto mt-1 max-w-md text-sm text-[var(--color-redup)]">{keterangan}</p>
      ) : null}
      {aksi ? <div className="mt-4 flex justify-center">{aksi}</div> : null}
    </div>
  )
}

export function Tabel({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--color-garis)] bg-white">
      <table className={cn('w-full text-sm', className)} {...props} />
    </div>
  )
}

export function Th({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'border-b border-[var(--color-garis)] px-4 py-2.5 text-left text-xs font-medium',
        'text-[var(--color-redup)] whitespace-nowrap',
        className,
      )}
      {...props}
    />
  )
}

export function Td({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn('border-b border-[var(--color-garis)] px-4 py-3 align-top', className)}
      {...props}
    />
  )
}

/** Daftar pasangan label–nilai untuk halaman detail. */
export function Rincian({ children }: { children: React.ReactNode }) {
  return <dl className="divide-y divide-[var(--color-garis)]">{children}</dl>
}

export function BarisRincian({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 py-2.5 first:pt-0 last:pb-0">
      <dt className="text-sm text-[var(--color-redup)]">{label}</dt>
      <dd className="max-w-[60%] text-right text-sm">{children}</dd>
    </div>
  )
}
