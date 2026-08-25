import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { JudulHalaman } from '@/components/halaman'
import { ambilKlien } from '@/lib/db/queries/klien'
import { ambilPengaturanPerusahaan } from '@/lib/db/queries/dasbor'
import { pecahanKePersen } from '@/lib/rules/uang'
import { FormPerjanjian } from './form-perjanjian'

export const metadata: Metadata = { title: 'Perjanjian baru · Modul Headhunter' }
export const dynamic = 'force-dynamic'

export default async function HalamanPerjanjianBaru({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const sesi = await auth()

  // Perjanjian memuat nilai fee — hanya pemilik yang boleh membukanya.
  if (sesi?.user.role !== 'owner') redirect(`/klien/${id}`)

  const klien = await ambilKlien(id)
  if (!klien) notFound()

  const pengaturan = await ambilPengaturanPerusahaan()

  return (
    <div className="max-w-3xl">
      <JudulHalaman
        judul="Perjanjian jasa rekrutmen"
        keterangan={klien.name}
        kembali={{ href: `/klien/${id}`, label: klien.name }}
      />
      <FormPerjanjian
        clientId={id}
        bawaan={{
          feePercent: pecahanKePersen(pengaturan?.defaultFeePercent ?? '0.1500'),
          guaranteeDays: pengaturan?.defaultGuaranteeDays ?? 90,
          paymentTermsDays: pengaturan?.defaultPaymentTermsDays ?? 7,
          protectionMonths: pengaturan?.defaultProtectionMonths ?? 12,
        }}
      />
    </div>
  )
}
