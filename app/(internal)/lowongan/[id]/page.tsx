import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Badge, type NadaBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarisRincian, JudulHalaman, Rincian } from '@/components/halaman'
import { ambilLowongan } from '@/lib/db/queries/lowongan'
import { formatRupiah, formatTanggal, formatWaktu } from '@/lib/format'
import { STATUS_LOWONGAN } from '@/lib/validation/lowongan'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const baris = await ambilLowongan((await params).id)
  return { title: `${baris?.lowongan.title ?? 'Lowongan'} · Modul Headhunter` }
}

const NADA: Record<string, NadaBadge> = {
  draft: 'netral',
  open: 'aman',
  on_hold: 'hangat',
  filled: 'utama',
  cancelled: 'netral',
  lost: 'bahaya',
}

function DaftarPoin({ poin, kosong }: { poin: string[]; kosong: string }) {
  if (poin.length === 0) return <p className="text-sm text-[var(--color-redup)]">{kosong}</p>
  return (
    <ul className="space-y-1.5">
      {poin.map((p, i) => (
        <li key={i} className="flex gap-2 text-sm">
          <span className="text-[var(--color-redup)]">·</span>
          <span>{p}</span>
        </li>
      ))}
    </ul>
  )
}

export default async function HalamanDetailLowongan({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const baris = await ambilLowongan(id)
  if (!baris) notFound()

  const { lowongan: l, klien } = baris

  const gaji =
    l.salaryMin !== null && l.salaryMax !== null
      ? `${formatRupiah(l.salaryMin)} – ${formatRupiah(l.salaryMax)}`
      : l.salaryMin !== null
        ? `dari ${formatRupiah(l.salaryMin)}`
        : l.salaryMax !== null
          ? `sampai ${formatRupiah(l.salaryMax)}`
          : '—'

  return (
    <div>
      <JudulHalaman
        judul={l.title}
        kembali={{ href: '/lowongan', label: 'Daftar lowongan' }}
        keterangan={
          <span className="flex flex-wrap items-center gap-2">
            <Badge nada={NADA[l.status] ?? 'netral'}>
              {STATUS_LOWONGAN.find((s) => s.nilai === l.status)?.label}
            </Badge>
            <Link href={`/klien/${klien.id}`} className="hover:underline">
              {klien.name}
            </Link>
            {l.location ? <span>· {l.location}</span> : null}
          </span>
        }
        aksi={
          <Link href={`/lowongan/${l.id}/ubah`}>
            <Button variant="garis">Sunting</Button>
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* SPEC §6.3 — ditaruh paling atas karena ini yang paling sering dibaca ulang. */}
          <Card className={l.reasonPreviousFailed ? 'border-[var(--color-utama)]' : undefined}>
            <CardHeader>
              <CardTitle>Kenapa kandidat sebelumnya tidak cocok</CardTitle>
            </CardHeader>
            <CardContent>
              {l.reasonPreviousFailed ? (
                <p className="text-sm whitespace-pre-wrap">{l.reasonPreviousFailed}</p>
              ) : (
                <p className="text-sm text-[var(--color-redup)]">
                  Belum dijawab. Lowongan tidak bisa dibuka sebelum ini diisi — jawabannya yang
                  memberi tahu apa yang sebenarnya dicari klien.
                </p>
              )}
              {l.vacancyAgeNote ? (
                <p className="mt-3 text-xs text-[var(--color-redup)]">
                  Sudah kosong: {l.vacancyAgeNote}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Syarat wajib</CardTitle>
              </CardHeader>
              <CardContent>
                <DaftarPoin poin={l.mustHave} kosong="Belum diisi." />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Nilai tambah</CardTitle>
              </CardHeader>
              <CardContent>
                <DaftarPoin poin={l.niceToHave} kosong="Belum diisi." />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Pertanyaan penyaringan awal</CardTitle>
            </CardHeader>
            <CardContent>
              {l.screeningQuestions.length === 0 ? (
                <p className="text-sm text-[var(--color-redup)]">
                  Belum ada. Mulai Fase 4, daftar ini bisa dibuatkan otomatis dari syarat wajib dan
                  alasan kandidat sebelumnya gagal, lalu Anda sunting.
                </p>
              ) : (
                <ol className="space-y-2">
                  {l.screeningQuestions.map((q, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="angka text-[var(--color-redup)]">{i + 1}.</span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Rincian</CardTitle>
            </CardHeader>
            <CardContent>
              <Rincian>
                <BarisRincian label="Jumlah dibutuhkan">
                  <span className="angka">{l.headcount}</span>
                </BarisRincian>
                <BarisRincian label="Gaji pokok">
                  <span className="angka">{gaji}</span>
                </BarisRincian>
                <BarisRincian label="Hubungan kerja">{l.employmentType ?? '—'}</BarisRincian>
                <BarisRincian label="Target mulai">
                  {l.targetStartDate ? formatTanggal(l.targetStartDate) : '—'}
                </BarisRincian>
                <BarisRincian label="Pengambil keputusan">{l.decisionMaker ?? '—'}</BarisRincian>
                <BarisRincian label="Pewawancara">{l.interviewer ?? '—'}</BarisRincian>
                <BarisRincian label="Dibuka">
                  {l.openedAt ? formatWaktu(l.openedAt) : 'Belum dibuka'}
                </BarisRincian>
                <BarisRincian label="Ditutup">
                  {l.closedAt ? formatWaktu(l.closedAt) : '—'}
                </BarisRincian>
              </Rincian>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Kandidat</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[var(--color-redup)]">
                Mengaitkan kandidat ke lowongan, papan tahapan, dan jejak audit perpindahannya
                dibangun di Fase 2.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
