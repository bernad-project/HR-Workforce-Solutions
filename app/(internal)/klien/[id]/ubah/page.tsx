import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { JudulHalaman } from '@/components/halaman'
import { ambilKlien } from '@/lib/db/queries/klien'
import { FormKlien } from '../../form-klien'

export const metadata: Metadata = { title: 'Sunting klien · Modul Headhunter' }
export const dynamic = 'force-dynamic'

export default async function HalamanUbahKlien({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const klien = await ambilKlien(id)
  if (!klien) notFound()

  return (
    <div className="max-w-3xl">
      <JudulHalaman judul={`Sunting ${klien.name}`} kembali={{ href: `/klien/${id}`, label: klien.name }} />
      <FormKlien klien={klien} />
    </div>
  )
}
