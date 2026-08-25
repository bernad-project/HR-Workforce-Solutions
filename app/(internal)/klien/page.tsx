import type { Metadata } from 'next'
import Link from 'next/link'
import { Badge, type NadaBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { JudulHalaman, Kosong, Tabel, Td, Th } from '@/components/halaman'
import { daftarKlien } from '@/lib/db/queries/klien'
import { STATUS_KLIEN } from '@/lib/validation/klien'
import { PenyaringKlien } from './penyaring'

export const metadata: Metadata = { title: 'Klien · Modul Headhunter' }
export const dynamic = 'force-dynamic'

const NADA_STATUS: Record<string, NadaBadge> = {
  prospect: 'hangat',
  active: 'aman',
  dormant: 'netral',
  blacklist: 'bahaya',
}

function labelStatus(nilai: string): string {
  return STATUS_KLIEN.find((s) => s.nilai === nilai)?.label ?? nilai
}

export default async function HalamanKlien({
  searchParams,
}: {
  searchParams: Promise<{ cari?: string; status?: string }>
}) {
  const sp = await searchParams
  const baris = await daftarKlien({ cari: sp.cari, status: sp.status })
  const adaPenyaring = Boolean(sp.cari || sp.status)

  return (
    <div>
      <JudulHalaman
        judul="Klien"
        keterangan="Perusahaan yang memakai jasa rekrutmen kita."
        aksi={
          <Link href="/klien/baru">
            <Button>Tambah klien</Button>
          </Link>
        }
      />

      <div className="mb-4">
        <PenyaringKlien cari={sp.cari ?? ''} status={sp.status ?? ''} />
      </div>

      {baris.length === 0 ? (
        <Kosong
          judul={adaPenyaring ? 'Tidak ada klien yang cocok' : 'Belum ada klien'}
          keterangan={
            adaPenyaring
              ? 'Coba ubah kata kunci atau kosongkan penyaringnya.'
              : 'Mulai dari sini. Setelah klien dibuat, Anda bisa menambahkan perjanjian jasa rekrutmen dan lowongan miliknya.'
          }
          aksi={
            adaPenyaring ? null : (
              <Link href="/klien/baru">
                <Button>Tambah klien pertama</Button>
              </Link>
            )
          }
        />
      ) : (
        <Tabel>
          <thead>
            <tr>
              <Th>Nama</Th>
              <Th>Industri</Th>
              <Th>PIC</Th>
              <Th>Status</Th>
              <Th className="text-right">Lowongan terbuka</Th>
              <Th>Perjanjian</Th>
            </tr>
          </thead>
          <tbody>
            {baris.map((k) => (
              <tr key={k.id} className="hover:bg-[var(--color-permukaan)]">
                <Td>
                  <Link href={`/klien/${k.id}`} className="font-medium text-[var(--color-utama)] hover:underline">
                    {k.name}
                  </Link>
                </Td>
                <Td className="text-[var(--color-redup)]">{k.industry ?? '—'}</Td>
                <Td>
                  {k.picName ? (
                    <>
                      <div>{k.picName}</div>
                      {k.picPhone ? (
                        <div className="angka text-xs text-[var(--color-redup)]">{k.picPhone}</div>
                      ) : null}
                    </>
                  ) : (
                    <span className="text-[var(--color-redup)]">—</span>
                  )}
                </Td>
                <Td>
                  <Badge nada={NADA_STATUS[k.status] ?? 'netral'}>{labelStatus(k.status)}</Badge>
                </Td>
                <Td className="angka text-right">{k.lowonganTerbuka}</Td>
                <Td>
                  {k.punyaPerjanjian ? (
                    <Badge nada="aman">Ada</Badge>
                  ) : (
                    <Badge nada="hangat">Belum ada</Badge>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Tabel>
      )}
    </div>
  )
}
