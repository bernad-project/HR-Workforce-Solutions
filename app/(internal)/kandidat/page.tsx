import type { Metadata } from 'next'
import Link from 'next/link'
import { Badge, type NadaBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { JudulHalaman, Kosong, Tabel, Td, Th } from '@/components/halaman'
import { daftarKandidat, daftarKota } from '@/lib/db/queries/kandidat'
import { formatRupiah, formatWaktu } from '@/lib/format'
import { STATUS_KANDIDAT } from '@/lib/validation/kandidat'
import { PenyaringKandidat } from './penyaring'

export const metadata: Metadata = { title: 'Kandidat · Modul Headhunter' }
export const dynamic = 'force-dynamic'

const NADA: Record<string, NadaBadge> = {
  active: 'aman',
  placed: 'utama',
  withdrawn: 'netral',
  blacklist: 'bahaya',
}

export default async function HalamanKandidat({
  searchParams,
}: {
  searchParams: Promise<{ cari?: string; keahlian?: string; status?: string; kota?: string }>
}) {
  const sp = await searchParams
  const [baris, kota] = await Promise.all([
    daftarKandidat({ cari: sp.cari, keahlian: sp.keahlian, status: sp.status, kota: sp.kota }),
    daftarKota(),
  ])
  const adaPenyaring = Boolean(sp.cari || sp.keahlian || sp.status || sp.kota)

  return (
    <div>
      <JudulHalaman
        judul="Kandidat"
        keterangan="Kandidat yang tidak cocok di satu klien sering cocok di klien berikutnya. Di sinilah mereka disimpan supaya mudah ditemukan lagi."
        aksi={
          <Link href="/kandidat/baru">
            <Button>Tambah kandidat</Button>
          </Link>
        }
      />

      <div className="mb-4">
        <PenyaringKandidat
          cari={sp.cari ?? ''}
          keahlian={sp.keahlian ?? ''}
          status={sp.status ?? ''}
          kota={sp.kota ?? ''}
          daftarKota={kota}
        />
      </div>

      {baris.length === 0 ? (
        <Kosong
          judul={adaPenyaring ? 'Tidak ada kandidat yang cocok' : 'Belum ada kandidat'}
          keterangan={
            adaPenyaring
              ? 'Coba ubah kata kunci atau kosongkan penyaringnya.'
              : 'Setiap kandidat yang dimasukkan wajib punya catatan persetujuan pemrosesan data — formulirnya sudah menyiapkan itu.'
          }
          aksi={
            adaPenyaring ? null : (
              <Link href="/kandidat/baru">
                <Button>Tambah kandidat pertama</Button>
              </Link>
            )
          }
        />
      ) : (
        <>
          <p className="mb-2 text-xs text-[var(--color-redup)]">
            {baris.length} kandidat{baris.length === 200 ? ' pertama (persempit pencarian)' : ''}
          </p>
          <Tabel>
            <thead>
              <tr>
                <Th>Nama</Th>
                <Th>Posisi sekarang</Th>
                <Th>Domisili</Th>
                <Th className="text-right">Pengalaman</Th>
                <Th className="text-right">Ekspektasi gaji</Th>
                <Th>Keahlian</Th>
                <Th>Status</Th>
                <Th>CV</Th>
                <Th>Aktivitas terakhir</Th>
              </tr>
            </thead>
            <tbody>
              {baris.map((k) => (
                <tr key={k.id} className="hover:bg-[var(--color-permukaan)]">
                  <Td>
                    <Link
                      href={`/kandidat/${k.id}`}
                      className="font-medium text-[var(--color-utama)] hover:underline"
                    >
                      {k.fullName}
                    </Link>
                    {k.phone ? (
                      <div className="angka text-xs text-[var(--color-redup)]">{k.phone}</div>
                    ) : null}
                  </Td>
                  <Td>
                    {k.currentTitle ?? '—'}
                    {k.currentCompany ? (
                      <div className="text-xs text-[var(--color-redup)]">{k.currentCompany}</div>
                    ) : null}
                  </Td>
                  <Td className="text-[var(--color-redup)]">{k.domicileCity ?? '—'}</Td>
                  <Td className="angka text-right">
                    {k.yearsExperience ? `${k.yearsExperience.replace('.', ',')} th` : '—'}
                  </Td>
                  <Td className="angka text-right whitespace-nowrap">
                    {k.expectedSalary !== null ? formatRupiah(k.expectedSalary) : '—'}
                  </Td>
                  <Td>
                    {k.skills.length === 0 ? (
                      <span className="text-[var(--color-redup)]">—</span>
                    ) : (
                      <span className="flex flex-wrap gap-1">
                        {k.skills.slice(0, 3).map((s) => (
                          <Badge key={s}>{s}</Badge>
                        ))}
                        {k.skills.length > 3 ? (
                          <span className="text-xs text-[var(--color-redup)]">
                            +{k.skills.length - 3}
                          </span>
                        ) : null}
                      </span>
                    )}
                  </Td>
                  <Td>
                    <Badge nada={NADA[k.status] ?? 'netral'}>
                      {STATUS_KANDIDAT.find((s) => s.nilai === k.status)?.label}
                    </Badge>
                  </Td>
                  <Td>
                    {k.punyaCv ? <Badge nada="aman">Ada</Badge> : <Badge nada="hangat">Belum</Badge>}
                  </Td>
                  <Td className="text-[var(--color-redup)] whitespace-nowrap">
                    {formatWaktu(k.lastActivityAt)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Tabel>
        </>
      )}
    </div>
  )
}
