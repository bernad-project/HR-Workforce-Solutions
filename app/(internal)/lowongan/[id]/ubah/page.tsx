import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { JudulHalaman } from '@/components/halaman'
import { pilihanKlien } from '@/lib/db/queries/klien'
import { ambilLowongan, semuaPerjanjianRingkas } from '@/lib/db/queries/lowongan'
import { formatTanggal } from '@/lib/format'
import { FormLowongan } from '../../form-lowongan'

export const metadata: Metadata = { title: 'Sunting lowongan · Modul Headhunter' }
export const dynamic = 'force-dynamic'

export default async function HalamanUbahLowongan({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const sesi = await auth()
  const baris = await ambilLowongan(id)
  if (!baris) notFound()

  const [daftarKlien, perjanjian] = await Promise.all([pilihanKlien(), semuaPerjanjianRingkas()])

  return (
    <div className="max-w-3xl">
      <JudulHalaman
        judul={`Sunting ${baris.lowongan.title}`}
        keterangan={baris.klien.name}
        kembali={{ href: `/lowongan/${id}`, label: baris.lowongan.title }}
      />
      <FormLowongan
        lowongan={baris.lowongan}
        daftarKlien={daftarKlien}
        bolehPilihPerjanjian={sesi?.user.role === 'owner'}
        daftarPerjanjian={perjanjian.map((p) => ({
          id: p.id,
          clientId: p.clientId,
          isActive: p.isActive,
          label: [p.agreementNumber ?? 'Tanpa nomor', p.signedDate ? formatTanggal(p.signedDate) : null]
            .filter(Boolean)
            .join(' · '),
        }))}
      />
    </div>
  )
}
