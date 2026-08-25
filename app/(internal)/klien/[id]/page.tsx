import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { Badge, type NadaBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarisRincian, JudulHalaman, Kosong, Rincian, Tabel, Td, Th } from '@/components/halaman'
import { ambilKlien, daftarPerjanjian } from '@/lib/db/queries/klien'
import { daftarLowonganKlien } from '@/lib/db/queries/lowongan'
import { formatPersen, formatTanggal, formatWaktu } from '@/lib/format'
import { STATUS_KLIEN } from '@/lib/validation/klien'
import { STATUS_LOWONGAN } from '@/lib/validation/lowongan'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const klien = await ambilKlien((await params).id)
  return { title: `${klien?.name ?? 'Klien'} · Modul Headhunter` }
}

const NADA_STATUS: Record<string, NadaBadge> = {
  prospect: 'hangat',
  active: 'aman',
  dormant: 'netral',
  blacklist: 'bahaya',
}

const NADA_LOWONGAN: Record<string, NadaBadge> = {
  draft: 'netral',
  open: 'aman',
  on_hold: 'hangat',
  filled: 'utama',
  cancelled: 'netral',
  lost: 'bahaya',
}

export default async function HalamanDetailKlien({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sesi = await auth()
  const klien = await ambilKlien(id)
  if (!klien) notFound()

  const adalahOwner = sesi?.user.role === 'owner'
  const lowongan = await daftarLowonganKlien(id)
  // Perjanjian memuat persentase fee. Peran `recruiter` tidak pernah melihat
  // nilai fee (CLAUDE.md poin 8), jadi datanya tidak diambil sama sekali —
  // bukan diambil lalu disembunyikan di tampilan.
  const perjanjian = adalahOwner ? await daftarPerjanjian(id) : []

  return (
    <div>
      <JudulHalaman
        judul={klien.name}
        kembali={{ href: '/klien', label: 'Daftar klien' }}
        keterangan={
          <span className="flex flex-wrap items-center gap-2">
            <Badge nada={NADA_STATUS[klien.status] ?? 'netral'}>
              {STATUS_KLIEN.find((s) => s.nilai === klien.status)?.label}
            </Badge>
            {klien.industry ? <span>{klien.industry}</span> : null}
          </span>
        }
        aksi={
          <>
            <Link href={`/lowongan/baru?klien=${klien.id}`}>
              <Button variant="garis">Tambah lowongan</Button>
            </Link>
            <Link href={`/klien/${klien.id}/ubah`}>
              <Button variant="garis">Sunting</Button>
            </Link>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Penanggung jawab</CardTitle>
          </CardHeader>
          <CardContent>
            <Rincian>
              <BarisRincian label="Nama">{klien.picName ?? '—'}</BarisRincian>
              <BarisRincian label="Jabatan">{klien.picTitle ?? '—'}</BarisRincian>
              <BarisRincian label="WhatsApp">
                <span className="angka">{klien.picPhone ?? '—'}</span>
              </BarisRincian>
              <BarisRincian label="Email">{klien.picEmail ?? '—'}</BarisRincian>
              <BarisRincian label="NPWP">
                <span className="angka">{klien.npwp ?? '—'}</span>
              </BarisRincian>
              <BarisRincian label="Alamat">{klien.address ?? '—'}</BarisRincian>
              <BarisRincian label="Dibuat">{formatWaktu(klien.createdAt)}</BarisRincian>
            </Rincian>
            {klien.notes ? (
              <div className="mt-4 rounded-md bg-[var(--color-permukaan)] p-3">
                <p className="mb-1 text-xs font-medium text-[var(--color-redup)]">Catatan internal</p>
                <p className="text-sm whitespace-pre-wrap">{klien.notes}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          {adalahOwner ? (
            <Card>
              <CardHeader className="flex items-center justify-between gap-3">
                <CardTitle>Perjanjian jasa rekrutmen</CardTitle>
                <Link href={`/klien/${klien.id}/perjanjian/baru`}>
                  <Button size="kecil" variant="garis">
                    Tambah perjanjian
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {perjanjian.length === 0 ? (
                  <p className="text-sm text-[var(--color-redup)]">
                    Belum ada perjanjian. Ketentuan komersial — persentase fee, masa garansi, dan
                    masa proteksi kandidat — hidup di sini, dan angkanya disalin ke setiap
                    penempatan supaya tagihan lama tidak ikut berubah bila fee direvisi tahun depan.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {perjanjian.map((p) => (
                      <div
                        key={p.id}
                        className="rounded-md border border-[var(--color-garis)] p-3"
                      >
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-medium">
                            {p.agreementNumber ?? 'Tanpa nomor'}
                          </span>
                          {p.isActive ? (
                            <Badge nada="aman">Berlaku</Badge>
                          ) : (
                            <Badge nada="netral">Tidak berlaku</Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
                          <div>
                            <span className="text-xs text-[var(--color-redup)]">Fee</span>
                            <p className="angka font-medium">{formatPersen(p.feePercent)}</p>
                          </div>
                          <div>
                            <span className="text-xs text-[var(--color-redup)]">Tagihan pertama</span>
                            <p className="angka font-medium">{formatPersen(p.splitFirstPercent)}</p>
                          </div>
                          <div>
                            <span className="text-xs text-[var(--color-redup)]">Garansi</span>
                            <p className="angka font-medium">{p.guaranteeDays} hari</p>
                          </div>
                          <div>
                            <span className="text-xs text-[var(--color-redup)]">Tempo bayar</span>
                            <p className="angka font-medium">{p.paymentTermsDays} hari</p>
                          </div>
                          <div>
                            <span className="text-xs text-[var(--color-redup)]">Proteksi kandidat</span>
                            <p className="angka font-medium">{p.protectionMonths} bulan</p>
                          </div>
                          <div>
                            <span className="text-xs text-[var(--color-redup)]">Ditandatangani</span>
                            <p className="font-medium">
                              {p.signedDate ? formatTanggal(p.signedDate) : '—'}
                            </p>
                          </div>
                        </div>
                        {p.notes ? (
                          <p className="mt-2 text-xs whitespace-pre-wrap text-[var(--color-redup)]">
                            {p.notes}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Lowongan</CardTitle>
            </CardHeader>
            <CardContent>
              {lowongan.length === 0 ? (
                <Kosong
                  judul="Belum ada lowongan"
                  keterangan="Tambahkan lowongan untuk mulai mencatat kebutuhan klien ini."
                  aksi={
                    <Link href={`/lowongan/baru?klien=${klien.id}`}>
                      <Button size="kecil">Tambah lowongan</Button>
                    </Link>
                  }
                />
              ) : (
                <Tabel>
                  <thead>
                    <tr>
                      <Th>Jabatan</Th>
                      <Th className="text-right">Kebutuhan</Th>
                      <Th>Status</Th>
                      <Th>Dibuka</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowongan.map((l) => (
                      <tr key={l.id} className="hover:bg-[var(--color-permukaan)]">
                        <Td>
                          <Link
                            href={`/lowongan/${l.id}`}
                            className="font-medium text-[var(--color-utama)] hover:underline"
                          >
                            {l.title}
                          </Link>
                        </Td>
                        <Td className="angka text-right">{l.headcount}</Td>
                        <Td>
                          <Badge nada={NADA_LOWONGAN[l.status] ?? 'netral'}>
                            {STATUS_LOWONGAN.find((s) => s.nilai === l.status)?.label}
                          </Badge>
                        </Td>
                        <Td className="text-[var(--color-redup)]">
                          {l.openedAt ? formatWaktu(l.openedAt) : '—'}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Tabel>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
