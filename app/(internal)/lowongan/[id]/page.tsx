import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Badge, type NadaBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarisRincian, JudulHalaman, Rincian } from '@/components/halaman'
import { ambilLowongan } from '@/lib/db/queries/lowongan'
import {
  daftarPengajuanLowongan,
  kandidatBelumDiajukan,
  proteksiKlien,
} from '@/lib/db/queries/pengajuan'
import { jumlahKandidat } from '@/lib/db/queries/kandidat'
import { BadgeTahap } from '@/components/tahap'
import { Tabel, Td, Th } from '@/components/halaman'
import { formatRupiah, formatTanggal, formatWaktu } from '@/lib/format'
import { STATUS_LOWONGAN } from '@/lib/validation/lowongan'
import { KaitkanKandidat, type PilihanKandidat } from './kaitkan-kandidat'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const baris = await ambilLowongan((await params).id)
  return { title: `${baris?.lowongan.title ?? 'Lowongan'} · Modul Headhunter` }
}

type Pencarian = Promise<{ kandidat?: string }>

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
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Pencarian
}) {
  const { id } = await params
  const baris = await ambilLowongan(id)
  if (!baris) notFound()

  const { lowongan: l, klien } = baris
  const cariKandidat = (await searchParams).kandidat?.trim() ?? ''

  const [pengajuan, calon, proteksi, totalKandidat] = await Promise.all([
    daftarPengajuanLowongan(id),
    kandidatBelumDiajukan(id, cariKandidat || undefined),
    proteksiKlien(klien.id),
    jumlahKandidat(),
  ])

  const pilihan: PilihanKandidat[] = calon.map((k) => {
    const p = proteksi.get(k.id)
    return {
      id: k.id,
      fullName: k.fullName,
      currentTitle: k.currentTitle,
      currentCompany: k.currentCompany,
      domicileCity: k.domicileCity,
      yearsExperience: k.yearsExperience,
      expectedSalary: k.expectedSalary,
      proteksi:
        p && p.terlindungi
          ? {
              berakhirPada: p.berakhirPada,
              pertamaDiajukan: p.pertamaDiajukan,
              jobTitle: p.jobTitle,
            }
          : null,
    }
  })

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
                <CardTitle>Tugas utama sehari-hari</CardTitle>
              </CardHeader>
              <CardContent>
                <DaftarPoin poin={l.mainDuties} kosong="Belum diisi." />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tunjangan di luar gaji pokok</CardTitle>
              </CardHeader>
              <CardContent>
                <DaftarPoin poin={l.benefits} kosong="Belum diisi." />
              </CardContent>
            </Card>
          </div>

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
              <CardTitle>Kandidat di lowongan ini</CardTitle>
            </CardHeader>
            <CardContent>
              {pengajuan.length === 0 ? (
                <p className="text-sm text-[var(--color-redup)]">
                  Belum ada kandidat yang dikaitkan. Setiap kandidat yang dikaitkan langsung punya
                  riwayat perpindahan tahapnya sendiri.
                </p>
              ) : (
                <Tabel>
                  <thead>
                    <tr>
                      <Th>Kandidat</Th>
                      <Th>Tahap</Th>
                      <Th>Diajukan ke klien</Th>
                      <Th>Terakhir bergerak</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {pengajuan.map((p) => (
                      <tr key={p.id} className="hover:bg-[var(--color-permukaan)]">
                        <Td>
                          <Link
                            href={`/pengajuan/${p.id}`}
                            className="font-medium text-[var(--color-utama)] hover:underline"
                          >
                            {p.candidateName}
                          </Link>
                          {p.candidateTitle ? (
                            <p className="text-xs text-[var(--color-redup)]">{p.candidateTitle}</p>
                          ) : null}
                        </Td>
                        <Td>
                          <BadgeTahap tahap={p.stage} />
                        </Td>
                        <Td className="text-[var(--color-redup)] whitespace-nowrap">
                          {p.submittedAt ? formatWaktu(p.submittedAt) : '—'}
                        </Td>
                        <Td className="text-[var(--color-redup)] whitespace-nowrap">
                          {formatWaktu(p.stageUpdatedAt)}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Tabel>
              )}
            </CardContent>
          </Card>

          <Card id="kaitkan">
            <CardHeader>
              <CardTitle>Kaitkan kandidat ke lowongan ini</CardTitle>
            </CardHeader>
            <CardContent>
              <KaitkanKandidat
                jobId={l.id}
                kandidat={pilihan}
                cari={cariKandidat}
                adaKandidatSamaSekali={totalKandidat > 0}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tahapan wawancara di sisi klien</CardTitle>
            </CardHeader>
            <CardContent>
              {l.clientInterviewStages.length === 0 ? (
                <p className="text-sm text-[var(--color-redup)]">
                  Belum diisi. Kandidat biasanya menanyakan ini lebih dulu sebelum bersedia
                  diajukan.
                </p>
              ) : (
                <ol className="space-y-2">
                  {l.clientInterviewStages.map((tahap, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="angka text-[var(--color-redup)]">{i + 1}.</span>
                      <span>{tahap}</span>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>

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
                <BarisRincian label="Departemen">{l.department ?? '—'}</BarisRincian>
                <BarisRincian label="Atasan langsung">{l.reportsTo ?? '—'}</BarisRincian>
                <BarisRincian label="Pola kerja">{l.workArrangement ?? '—'}</BarisRincian>
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
              <CardTitle>Kandidat di lowongan ini</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="angka text-2xl font-semibold">{pengajuan.length}</p>
              <p className="mt-1 text-sm text-[var(--color-redup)]">
                {pengajuan.length === 0
                  ? 'Belum ada. Kaitkan kandidat lewat kotak di bawah.'
                  : `${pengajuan.filter((p) => p.submittedAt !== null).length} di antaranya sudah diajukan ke klien.`}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
