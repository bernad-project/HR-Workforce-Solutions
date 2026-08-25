import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Badge, type NadaBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarisRincian, JudulHalaman, Rincian } from '@/components/halaman'
import {
  ambilKandidat,
  daftarDokumen,
  daftarPersetujuan,
} from '@/lib/db/queries/kandidat'
import { formatRupiah, formatTanggal, formatWaktu } from '@/lib/format'
import { teleponKeWa } from '@/lib/rules/duplikat'
import { SALURAN_PERSETUJUAN } from '@/lib/pdp'
import { STATUS_KANDIDAT as PILIHAN_STATUS } from '@/lib/validation/kandidat'
import { UnggahCv } from './unggah-cv'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const kandidat = await ambilKandidat((await params).id)
  return { title: `${kandidat?.fullName ?? 'Kandidat'} · Modul Headhunter` }
}

const NADA: Record<string, NadaBadge> = {
  active: 'aman',
  placed: 'utama',
  withdrawn: 'netral',
  blacklist: 'bahaya',
}

function ukuranBerkas(byte: bigint | null): string {
  if (byte === null) return ''
  const kb = Number(byte) / 1024
  if (kb < 1024) return `${Math.round(kb)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

export default async function HalamanDetailKandidat({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const kandidat = await ambilKandidat(id)
  if (!kandidat) notFound()

  const [dokumen, persetujuan] = await Promise.all([daftarDokumen(id), daftarPersetujuan(id)])
  const persetujuanBerlaku = persetujuan.find((p) => p.withdrawnAt === null)

  return (
    <div>
      <JudulHalaman
        judul={kandidat.fullName}
        kembali={{ href: '/kandidat', label: 'Daftar kandidat' }}
        keterangan={
          <span className="flex flex-wrap items-center gap-2">
            <Badge nada={NADA[kandidat.status] ?? 'netral'}>
              {PILIHAN_STATUS.find((s) => s.nilai === kandidat.status)?.label}
            </Badge>
            {kandidat.currentTitle ? <span>{kandidat.currentTitle}</span> : null}
            {kandidat.currentCompany ? <span>· {kandidat.currentCompany}</span> : null}
          </span>
        }
        aksi={
          <>
            {kandidat.phone ? (
              <a
                href={`https://wa.me/${teleponKeWa(kandidat.phone)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="garis">WhatsApp</Button>
              </a>
            ) : null}
            <Link href={`/kandidat/${kandidat.id}/ubah`}>
              <Button variant="garis">Sunting</Button>
            </Link>
          </>
        }
      />

      {!persetujuanBerlaku ? (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-[var(--color-bahaya)] bg-[var(--color-bahaya-redup)] p-4"
        >
          <p className="text-sm font-medium text-[var(--color-bahaya)]">
            Kandidat ini tidak punya persetujuan yang berlaku.
          </p>
          <p className="mt-1 text-sm text-[var(--color-bahaya)]">
            Datanya tidak boleh dipakai untuk pengajuan ke klien sampai persetujuannya diperbarui.
          </p>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Profil</CardTitle>
            </CardHeader>
            <CardContent>
              <Rincian>
                <BarisRincian label="Nomor WhatsApp">
                  <span className="angka">{kandidat.phone ?? '—'}</span>
                </BarisRincian>
                <BarisRincian label="Email">{kandidat.email ?? '—'}</BarisRincian>
                <BarisRincian label="Domisili">{kandidat.domicileCity ?? '—'}</BarisRincian>
                <BarisRincian label="Pendidikan">{kandidat.education ?? '—'}</BarisRincian>
                <BarisRincian label="Total pengalaman">
                  <span className="angka">
                    {kandidat.yearsExperience
                      ? `${kandidat.yearsExperience.replace('.', ',')} tahun`
                      : '—'}
                  </span>
                </BarisRincian>
                <BarisRincian label="Masa pemberitahuan keluar">
                  <span className="angka">
                    {kandidat.noticePeriodDays !== null ? `${kandidat.noticePeriodDays} hari` : '—'}
                  </span>
                </BarisRincian>
                {/*
                  `current_salary` hanya muncul di layar internal ini. Ia tidak
                  pernah ikut ke portal klien (CLAUDE.md poin 7).
                */}
                <BarisRincian label="Gaji sekarang (internal)">
                  <span className="angka">
                    {kandidat.currentSalary !== null ? formatRupiah(kandidat.currentSalary) : '—'}
                  </span>
                </BarisRincian>
                <BarisRincian label="Ekspektasi gaji">
                  <span className="angka">
                    {kandidat.expectedSalary !== null ? formatRupiah(kandidat.expectedSalary) : '—'}
                  </span>
                </BarisRincian>
              </Rincian>

              {kandidat.skills.length > 0 ? (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-medium text-[var(--color-redup)]">Keahlian</p>
                  <div className="flex flex-wrap gap-1.5">
                    {kandidat.skills.map((s) => (
                      <Badge key={s}>{s}</Badge>
                    ))}
                  </div>
                </div>
              ) : null}

              {kandidat.notes ? (
                <div className="mt-4 rounded-md bg-[var(--color-permukaan)] p-3">
                  <p className="mb-1 text-xs font-medium text-[var(--color-redup)]">
                    Catatan internal
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{kandidat.notes}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dokumen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {dokumen.length === 0 ? (
                <p className="text-sm text-[var(--color-redup)]">Belum ada dokumen.</p>
              ) : (
                <ul className="divide-y divide-[var(--color-garis)]">
                  {dokumen.map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <a
                          href={`/api/dokumen/${d.id}`}
                          className="block truncate text-sm font-medium text-[var(--color-utama)] hover:underline"
                        >
                          {d.fileName}
                        </a>
                        <p className="text-xs text-[var(--color-redup)]">
                          {formatWaktu(d.uploadedAt)} · {ukuranBerkas(d.sizeBytes)}
                        </p>
                      </div>
                      {d.isCurrent ? <Badge nada="aman">Terkini</Badge> : <Badge>Versi lama</Badge>}
                    </li>
                  ))}
                </ul>
              )}

              <div className="border-t border-[var(--color-garis)] pt-4">
                <UnggahCv candidateId={kandidat.id} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Persetujuan data pribadi</CardTitle>
            </CardHeader>
            <CardContent>
              {persetujuan.length === 0 ? (
                <p className="text-sm text-[var(--color-bahaya)]">Tidak ada catatan persetujuan.</p>
              ) : (
                <div className="space-y-3">
                  {persetujuan.map((p) => (
                    <div key={p.id} className="rounded-md border border-[var(--color-garis)] p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">
                          {SALURAN_PERSETUJUAN.find((s) => s.nilai === p.method)?.label ?? p.method}
                        </span>
                        {p.withdrawnAt ? (
                          <Badge nada="bahaya">Ditarik</Badge>
                        ) : (
                          <Badge nada="aman">Berlaku</Badge>
                        )}
                      </div>
                      <Rincian>
                        <BarisRincian label="Diberikan">{formatWaktu(p.grantedAt)}</BarisRincian>
                        <BarisRincian label="Versi teks">
                          <span className="angka">{p.noticeVersion}</span>
                        </BarisRincian>
                        <BarisRincian label="Simpan sampai">
                          {formatTanggal(p.retentionUntil)}
                        </BarisRincian>
                      </Rincian>
                      {p.evidence ? (
                        <p className="mt-2 border-t border-[var(--color-garis)] pt-2 text-xs whitespace-pre-wrap text-[var(--color-redup)]">
                          {p.evidence}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-3 text-xs text-[var(--color-redup)]">
                Layar untuk menarik persetujuan dan memenuhi permintaan hak subjek data dibangun di
                Fase 7.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Riwayat</CardTitle>
            </CardHeader>
            <CardContent>
              <Rincian>
                <BarisRincian label="Sumber">
                  {kandidat.sourceDetail ?? kandidat.source}
                </BarisRincian>
                <BarisRincian label="Aktivitas terakhir">
                  {formatWaktu(kandidat.lastActivityAt)}
                </BarisRincian>
                <BarisRincian label="Dibuat">{formatWaktu(kandidat.createdAt)}</BarisRincian>
              </Rincian>
              <p className="mt-3 text-xs text-[var(--color-redup)]">
                Pengajuan kandidat ini ke lowongan, beserta riwayat tahapannya, muncul di sini
                setelah Fase 2 selesai.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
