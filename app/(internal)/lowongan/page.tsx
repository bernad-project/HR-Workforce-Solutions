import type { Metadata } from 'next'
import Link from 'next/link'
import { Badge, type NadaBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { JudulHalaman, Kosong, Tabel, Td, Th } from '@/components/halaman'
import { daftarLowongan } from '@/lib/db/queries/lowongan'
import { pilihanKlien } from '@/lib/db/queries/klien'
import { formatRupiah, formatWaktu } from '@/lib/format'
import { STATUS_LOWONGAN } from '@/lib/validation/lowongan'
import { PenyaringLowongan } from './penyaring'

export const metadata: Metadata = { title: 'Lowongan · Modul Headhunter' }
export const dynamic = 'force-dynamic'

const NADA: Record<string, NadaBadge> = {
  draft: 'netral',
  open: 'aman',
  on_hold: 'hangat',
  filled: 'utama',
  cancelled: 'netral',
  lost: 'bahaya',
}

function rentangGaji(min: bigint | null, maks: bigint | null): string {
  if (min === null && maks === null) return '—'
  if (min !== null && maks !== null) return `${formatRupiah(min)} – ${formatRupiah(maks)}`
  if (min !== null) return `dari ${formatRupiah(min)}`
  return `sampai ${formatRupiah(maks!)}`
}

export default async function HalamanLowongan({
  searchParams,
}: {
  searchParams: Promise<{ cari?: string; status?: string; klien?: string }>
}) {
  const sp = await searchParams
  const [baris, klien] = await Promise.all([
    daftarLowongan({ cari: sp.cari, status: sp.status, klien: sp.klien }),
    pilihanKlien(),
  ])
  const adaPenyaring = Boolean(sp.cari || sp.status || sp.klien)

  return (
    <div>
      <JudulHalaman
        judul="Lowongan"
        keterangan="Kebutuhan yang sedang kita kerjakan untuk klien."
        aksi={
          <Link href="/lowongan/baru">
            <Button>Tambah lowongan</Button>
          </Link>
        }
      />

      <div className="mb-4">
        <PenyaringLowongan
          cari={sp.cari ?? ''}
          status={sp.status ?? ''}
          klien={sp.klien ?? ''}
          daftarKlien={klien}
        />
      </div>

      {baris.length === 0 ? (
        <Kosong
          judul={adaPenyaring ? 'Tidak ada lowongan yang cocok' : 'Belum ada lowongan'}
          keterangan={
            adaPenyaring
              ? 'Coba ubah penyaringnya.'
              : klien.length === 0
                ? 'Buat klien lebih dulu — setiap lowongan harus punya klien pemiliknya.'
                : 'Catat kebutuhan klien di sini, lengkap dengan alasan kandidat sebelumnya gagal.'
          }
          aksi={
            adaPenyaring ? null : klien.length === 0 ? (
              <Link href="/klien/baru">
                <Button>Tambah klien dulu</Button>
              </Link>
            ) : (
              <Link href="/lowongan/baru">
                <Button>Tambah lowongan</Button>
              </Link>
            )
          }
        />
      ) : (
        <Tabel>
          <thead>
            <tr>
              <Th>Jabatan</Th>
              <Th>Klien</Th>
              <Th>Lokasi</Th>
              <Th>Rentang gaji pokok</Th>
              <Th className="text-right">Butuh</Th>
              <Th className="text-right">Pengajuan</Th>
              <Th>Status</Th>
              <Th>Dibuka</Th>
            </tr>
          </thead>
          <tbody>
            {baris.map((l) => (
              <tr key={l.id} className="hover:bg-[var(--color-permukaan)]">
                <Td>
                  <Link
                    href={`/lowongan/${l.id}`}
                    className="font-medium text-[var(--color-utama)] hover:underline"
                  >
                    {l.title}
                  </Link>
                </Td>
                <Td>
                  <Link href={`/klien/${l.clientId}`} className="hover:underline">
                    {l.clientName}
                  </Link>
                </Td>
                <Td className="text-[var(--color-redup)]">{l.location ?? '—'}</Td>
                <Td className="angka whitespace-nowrap">{rentangGaji(l.salaryMin, l.salaryMax)}</Td>
                <Td className="angka text-right">{l.headcount}</Td>
                <Td className="angka text-right">{l.jumlahPengajuan}</Td>
                <Td>
                  <Badge nada={NADA[l.status] ?? 'netral'}>
                    {STATUS_LOWONGAN.find((s) => s.nilai === l.status)?.label}
                  </Badge>
                </Td>
                <Td className="text-[var(--color-redup)] whitespace-nowrap">
                  {l.openedAt ? formatWaktu(l.openedAt) : '—'}
                </Td>
              </tr>
            ))}
          </tbody>
        </Tabel>
      )}
    </div>
  )
}
