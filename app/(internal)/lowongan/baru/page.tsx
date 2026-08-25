import type { Metadata } from 'next'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { JudulHalaman, Kosong } from '@/components/halaman'
import { pilihanKlien } from '@/lib/db/queries/klien'
import { semuaPerjanjianRingkas } from '@/lib/db/queries/lowongan'
import { formatTanggal } from '@/lib/format'
import { FormLowongan } from '../form-lowongan'

export const metadata: Metadata = { title: 'Lowongan baru · Modul Headhunter' }
export const dynamic = 'force-dynamic'

export default async function HalamanLowonganBaru({
  searchParams,
}: {
  searchParams: Promise<{ klien?: string }>
}) {
  const sesi = await auth()
  const [{ klien: klienAwal }, daftarKlien, perjanjian] = await Promise.all([
    searchParams,
    pilihanKlien(),
    semuaPerjanjianRingkas(),
  ])

  if (daftarKlien.length === 0) {
    return (
      <div className="max-w-3xl">
        <JudulHalaman judul="Lowongan baru" kembali={{ href: '/lowongan', label: 'Daftar lowongan' }} />
        <Kosong
          judul="Belum ada klien"
          keterangan="Setiap lowongan harus punya klien pemiliknya. Buat klien lebih dulu."
          aksi={
            <Link href="/klien/baru">
              <Button>Tambah klien</Button>
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      <JudulHalaman judul="Lowongan baru" kembali={{ href: '/lowongan', label: 'Daftar lowongan' }} />
      <FormLowongan
        daftarKlien={daftarKlien}
        klienAwal={klienAwal}
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
