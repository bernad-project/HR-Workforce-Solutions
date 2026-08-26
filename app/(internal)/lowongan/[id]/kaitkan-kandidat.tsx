'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PesanGalat, PesanSukses } from '@/components/ui/field'
import { formatRupiah, formatTanggal } from '@/lib/format'
import { KEADAAN_AWAL } from '@/lib/validation/umum'
import { simpanPengajuan } from '@/app/(internal)/pengajuan/aksi'

export type PilihanKandidat = {
  id: string
  fullName: string
  currentTitle: string | null
  currentCompany: string | null
  domicileCity: string | null
  yearsExperience: string | null
  expectedSalary: bigint | null
  /** Terisi bila kandidat ini masih dalam masa proteksi terhadap klien lowongan ini. */
  proteksi: { berakhirPada: string; pertamaDiajukan: string; jobTitle: string } | null
}

export function KaitkanKandidat({
  jobId,
  kandidat,
  cari,
  adaKandidatSamaSekali,
}: {
  jobId: string
  kandidat: PilihanKandidat[]
  cari: string
  adaKandidatSamaSekali: boolean
}) {
  const [keadaan, kirim, sedangKirim] = useActionState(simpanPengajuan, KEADAAN_AWAL)
  const router = useRouter()
  const sp = useSearchParams()

  function cariKandidat(kata: string) {
    const baru = new URLSearchParams(sp.toString())
    if (kata) baru.set('kandidat', kata)
    else baru.delete('kandidat')
    router.push(`/lowongan/${jobId}?${baru.toString()}#kaitkan`)
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          cariKandidat(String(new FormData(e.currentTarget).get('kandidat') ?? '').trim())
        }}
        className="flex flex-wrap gap-2"
      >
        <Input
          name="kandidat"
          defaultValue={cari}
          placeholder="Cari nama, jabatan, perusahaan, atau kota"
          className="max-w-sm"
        />
        <Button type="submit" variant="garis">
          Cari
        </Button>
        {cari ? (
          <Button type="button" variant="halus" onClick={() => cariKandidat('')}>
            Bersihkan
          </Button>
        ) : null}
      </form>

      <PesanGalat pesan={keadaan.pesan} />
      <PesanSukses pesan={keadaan.sukses} />

      {!cari && kandidat.length > 0 ? (
        <p className="text-xs text-[var(--color-redup)]">
          Menampilkan {kandidat.length} kandidat yang paling baru diperbarui. Ketik nama, jabatan,
          perusahaan, atau kota untuk mencari yang lain.
        </p>
      ) : null}

      {kandidat.length === 0 ? (
        <p className="text-sm text-[var(--color-redup)]">
          {!adaKandidatSamaSekali ? (
            <>
              Belum ada kandidat di basis data.{' '}
              <Link href="/kandidat/baru" className="text-[var(--color-utama)] hover:underline">
                Tambah kandidat dulu
              </Link>
              .
            </>
          ) : cari ? (
            'Tidak ada kandidat yang cocok. Coba kata lain, atau kandidatnya memang sudah dikaitkan ke lowongan ini.'
          ) : (
            'Semua kandidat sudah dikaitkan ke lowongan ini.'
          )}
        </p>
      ) : (
        <form action={kirim}>
          <input type="hidden" name="jobId" value={jobId} />
          <ul className="divide-y divide-[var(--color-garis)] rounded-lg border border-[var(--color-garis)]">
            {kandidat.map((k) => (
              <li key={k.id} className="flex flex-wrap items-start justify-between gap-3 p-3">
                <div className="min-w-0">
                  <Link
                    href={`/kandidat/${k.id}`}
                    className="text-sm font-medium text-[var(--color-utama)] hover:underline"
                  >
                    {k.fullName}
                  </Link>
                  <p className="text-xs text-[var(--color-redup)]">
                    {[
                      k.currentTitle,
                      k.currentCompany,
                      k.domicileCity,
                      k.yearsExperience ? `${k.yearsExperience} tahun pengalaman` : null,
                      k.expectedSalary !== null ? `harap ${formatRupiah(k.expectedSalary)}` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || 'Belum ada rincian profil'}
                  </p>

                  {/*
                    SPEC §5.5 poin 4: memperingatkan, BUKAN memblokir. Kandidat
                    yang sudah pernah diajukan ke klien ini tetap boleh diajukan
                    lagi ke lowongan lain — yang perlu diketahui perekrut adalah
                    klaim fee-nya berjalan sejak pengajuan pertama, bukan sejak
                    yang sekarang (SPEC §5.6).
                  */}
                  {k.proteksi ? (
                    <p className="mt-1 rounded-md bg-[#fef3c7] px-2 py-1 text-xs text-[#92400e]">
                      Sudah pernah diajukan ke klien ini lewat &ldquo;{k.proteksi.jobTitle}&rdquo; pada{' '}
                      {formatTanggal(k.proteksi.pertamaDiajukan)}. Masa proteksi berjalan sampai{' '}
                      {formatTanggal(k.proteksi.berakhirPada)} — klaim fee dihitung dari pengajuan
                      pertama itu.
                    </p>
                  ) : null}
                </div>

                <Button
                  type="submit"
                  name="candidateId"
                  value={k.id}
                  variant="garis"
                  size="kecil"
                  disabled={sedangKirim}
                >
                  Kaitkan
                </Button>
              </li>
            ))}
          </ul>
        </form>
      )}
    </div>
  )
}
