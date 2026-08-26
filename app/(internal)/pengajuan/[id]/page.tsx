import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarisRincian, JudulHalaman, Rincian } from '@/components/halaman'
import { BadgeTahap } from '@/components/tahap'
import {
  ambilPengajuan,
  cekProteksiKandidat,
  daftarCvKandidat,
  riwayatPengajuan,
} from '@/lib/db/queries/pengajuan'
import { formatRupiah, formatTanggal, formatWaktu } from '@/lib/format'
import { LABEL_TAHAP } from '@/lib/rules/tahapan'
import { PENOLAK } from '@/lib/validation/pengajuan'
import { PindahTahap } from './pindah-tahap'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const baris = await ambilPengajuan((await params).id)
  return {
    title: baris
      ? `${baris.kandidat.fullName} · ${baris.lowongan.title} · Modul Headhunter`
      : 'Pengajuan · Modul Headhunter',
  }
}

export default async function HalamanPengajuan({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sesi = await auth()
  const baris = await ambilPengajuan(id)
  if (!baris) notFound()

  const { pengajuan: p, kandidat, lowongan, klien } = baris
  const peran = sesi?.user.role === 'owner' ? 'owner' : 'recruiter'

  const [riwayat, cv, proteksi] = await Promise.all([
    riwayatPengajuan(id),
    daftarCvKandidat(kandidat.id),
    cekProteksiKandidat(kandidat.id, klien.id),
  ])

  return (
    <div>
      <JudulHalaman
        judul={kandidat.fullName}
        kembali={{ href: `/lowongan/${lowongan.id}`, label: lowongan.title }}
        keterangan={
          <span className="flex flex-wrap items-center gap-2">
            <BadgeTahap tahap={p.stage} />
            <Link href={`/kandidat/${kandidat.id}`} className="hover:underline">
              Profil kandidat
            </Link>
            <span>·</span>
            <Link href={`/klien/${klien.id}`} className="hover:underline">
              {klien.name}
            </Link>
          </span>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/*
            Inti Fase 2. SPEC §12: SELURUH metrik dihitung dari tabel ini, bukan
            dari kolom `stage`. Ditaruh paling atas karena riwayat inilah yang
            menjawab "kenapa pengajuan ini berhenti di sini".
          */}
          <Card>
            <CardHeader>
              <CardTitle>Riwayat perpindahan tahap</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="relative space-y-4 border-l border-[var(--color-garis)] pl-5">
                {riwayat.map((r) => (
                  <li key={String(r.id)} className="relative">
                    <span className="absolute top-1.5 -left-[1.4rem] h-2 w-2 rounded-full bg-[var(--color-utama)]" />
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="text-sm font-medium">
                        {r.fromStage
                          ? `${LABEL_TAHAP[r.fromStage]} → ${LABEL_TAHAP[r.toStage]}`
                          : `Dikaitkan ke lowongan (${LABEL_TAHAP[r.toStage]})`}
                      </span>
                      <span className="text-xs text-[var(--color-redup)]">
                        {formatWaktu(r.occurredAt)}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-redup)]">
                      oleh {r.actorIsClient ? 'klien' : (r.actorName ?? 'sistem')}
                    </p>
                    {r.note ? <p className="mt-1 text-sm whitespace-pre-wrap">{r.note}</p> : null}
                  </li>
                ))}
              </ol>
              {riwayat.length === 0 ? (
                <p className="text-sm text-[var(--color-redup)]">
                  Belum ada catatan perpindahan.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pindahkan tahap</CardTitle>
            </CardHeader>
            <CardContent>
              <PindahTahap
                submissionId={p.id}
                tahapSekarang={p.stage}
                peran={peran}
                submittedAt={p.submittedAt}
                cv={cv}
              />
            </CardContent>
          </Card>

          {p.stage === 'rejected' ? (
            <Card className="border-[var(--color-bahaya)]">
              <CardHeader>
                <CardTitle>Penolakan</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  Ditolak oleh{' '}
                  <strong>
                    {PENOLAK.find((x) => x.nilai === p.rejectedBy)?.label ?? 'tidak disebutkan'}
                  </strong>
                </p>
                {p.rejectionReason ? (
                  <p className="mt-1 text-sm whitespace-pre-wrap">{p.rejectionReason}</p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          {/*
            SPEC §5.5: stempel waktu yang menjadi dasar klaim fee. Ditampilkan
            terpisah dari rincian lain supaya jelas mana yang bisa berubah dan
            mana yang tidak.
          */}
          <Card className={p.submittedAt ? 'border-[var(--color-utama)]' : undefined}>
            <CardHeader>
              <CardTitle>Bukti pengajuan</CardTitle>
            </CardHeader>
            <CardContent>
              {p.submittedAt ? (
                <>
                  <p className="text-sm">
                    Diajukan ke {klien.name} pada{' '}
                    <strong className="angka">{formatWaktu(p.submittedAt)}</strong>.
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-redup)]">
                    Tanggal ini tidak pernah berubah, bahkan bila tahapnya dimundurkan.
                  </p>
                  {proteksi ? (
                    <p className="mt-3 rounded-md bg-[var(--color-permukaan)] p-2 text-xs">
                      Masa proteksi terhadap {proteksi.clientName}{' '}
                      {proteksi.terlindungi ? 'berlaku sampai' : 'sudah berakhir pada'}{' '}
                      <span className="angka">{formatTanggal(proteksi.berakhirPada)}</span>
                      {proteksi.terlindungi ? (
                        <>
                          {' '}
                          — sisa <span className="angka">{proteksi.sisaHari}</span> hari.
                        </>
                      ) : (
                        '.'
                      )}
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="text-sm text-[var(--color-redup)]">
                  Belum diajukan ke klien. Masa proteksi 12 bulan baru mulai berjalan saat tahap
                  mencapai &ldquo;{LABEL_TAHAP.submitted_to_client}&rdquo;.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rincian</CardTitle>
            </CardHeader>
            <CardContent>
              <Rincian>
                <BarisRincian label="Jabatan sekarang">{kandidat.currentTitle ?? '—'}</BarisRincian>
                <BarisRincian label="Perusahaan sekarang">
                  {kandidat.currentCompany ?? '—'}
                </BarisRincian>
                <BarisRincian label="Domisili">{kandidat.domicileCity ?? '—'}</BarisRincian>
                <BarisRincian label="Pengalaman">
                  {kandidat.yearsExperience ? `${kandidat.yearsExperience} tahun` : '—'}
                </BarisRincian>
                <BarisRincian label="Ekspektasi gaji">
                  <span className="angka">
                    {kandidat.expectedSalary !== null
                      ? formatRupiah(kandidat.expectedSalary)
                      : '—'}
                  </span>
                </BarisRincian>
                <BarisRincian label="Dikaitkan">{formatWaktu(p.createdAt)}</BarisRincian>
                <BarisRincian label="Terakhir bergerak">
                  {formatWaktu(p.stageUpdatedAt)}
                </BarisRincian>
                <BarisRincian label="Dilihat klien">
                  {p.clientViewedAt ? formatWaktu(p.clientViewedAt) : 'Belum — portal klien Fase 5'}
                </BarisRincian>
              </Rincian>
            </CardContent>
          </Card>

          {p.notes ? (
            <Card>
              <CardHeader>
                <CardTitle>Catatan pengajuan</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{p.notes}</p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  )
}
