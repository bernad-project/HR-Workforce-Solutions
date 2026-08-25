import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { JudulHalaman } from '@/components/halaman'
import { ambilKandidat } from '@/lib/db/queries/kandidat'
import { FormKandidat } from '../../form-kandidat'

export const metadata: Metadata = { title: 'Sunting kandidat · Modul Headhunter' }
export const dynamic = 'force-dynamic'

export default async function HalamanUbahKandidat({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const kandidat = await ambilKandidat(id)
  if (!kandidat) notFound()

  return (
    <div className="max-w-3xl">
      <JudulHalaman
        judul={`Sunting ${kandidat.fullName}`}
        kembali={{ href: `/kandidat/${id}`, label: kandidat.fullName }}
      />
      <FormKandidat kandidat={kandidat} />
    </div>
  )
}
