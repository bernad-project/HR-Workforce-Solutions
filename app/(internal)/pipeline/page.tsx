import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { JudulHalaman, Kosong } from '@/components/halaman'
import { BadgeTahap } from '@/components/tahap'
import { lowonganUntukPilihan, papanPipeline } from '@/lib/db/queries/pengajuan'
import { pilihanKlien } from '@/lib/db/queries/klien'
import { formatRupiah, formatWaktu } from '@/lib/format'
import { KETERANGAN_TAHAP, LABEL_TAHAP, TAHAP_AKHIR, URUTAN_TAHAP } from '@/lib/rules/tahapan'
import type { TahapPengajuan } from '@/lib/db/schema'
import { PenyaringPipeline } from './penyaring'

export const metadata: Metadata = { title: 'Pipeline · Modul Headhunter' }
export const dynamic = 'force-dynamic'

/**
 * Papan tahapan — SPEC §6.1.
 *
 * Bentuknya sengaja BUKAN sebelas kolom bersebelahan seperti papan Kanban yang
 * biasa dipakai sistem rekrutmen besar. Alasannya ukuran: perusahaan ini
 * menargetkan di bawah 25 penempatan setahun, jadi hampir setiap hari sebagian
 * besar tahap kosong. Sebelas kolom kosong yang harus digeser mendatar dulu
 * sebelum menemukan satu-satunya kandidat yang bergerak adalah papan yang
 * menyembunyikan pekerjaan, bukan menampilkannya.
 *
 * Karena itu: baris ringkasan menyebut SELURUH tahap beserta jumlahnya —
 * itulah "gambaran harian" yang diminta SPEC §12 — lalu di bawahnya hanya tahap
 * yang benar-benar berisi yang dibentangkan. Tidak ada yang disembunyikan;
 * yang kosong cukup diwakili angka nol.
 *
 * Yang sengaja TIDAK ada di sini: penyaringan berdasarkan skor AI. Skor itu
 * baru lahir di Fase 4, dan bahkan setelah ada, ia tidak pernah dipakai untuk
 * menyembunyikan kandidat dari daftar (CLAUDE.md poin 5).
 */
export default async function HalamanPipeline({
  searchParams,
}: {
  searchParams: Promise<{ cari?: string; lowongan?: string; klien?: string }>
}) {
  const sp = await searchParams
  const [baris, lowongan, klien] = await Promise.all([
    papanPipeline({ cari: sp.cari, lowongan: sp.lowongan, klien: sp.klien }),
    lowonganUntukPilihan(),
    pilihanKlien(),
  ])

  const adaPenyaring = Boolean(sp.cari || sp.lowongan || sp.klien)
  const semuaTahap = [...URUTAN_TAHAP, ...TAHAP_AKHIR] as TahapPengajuan[]
  const perTahap = new Map<TahapPengajuan, typeof baris>()
  for (const t of semuaTahap) perTahap.set(t, [])
  for (const b of baris) perTahap.get(b.stage)?.push(b)

  const berjalan = baris.filter((b) => b.stage !== 'rejected' && b.stage !== 'withdrawn').length
  const tahapBerisi = semuaTahap.filter((t) => (perTahap.get(t)?.length ?? 0) > 0)

  return (
    <div>
      <JudulHalaman
        judul="Pipeline"
        keterangan={
          <>
            <span className="angka">{berjalan}</span> pengajuan sedang berjalan dari{' '}
            <span className="angka">{baris.length}</span> seluruhnya. Setiap perpindahan tahap
            tercatat dan tidak bisa dihapus.
          </>
        }
      />

      <div className="mb-5">
        <PenyaringPipeline
          cari={sp.cari ?? ''}
          lowongan={sp.lowongan ?? ''}
          klien={sp.klien ?? ''}
          daftarLowongan={lowongan}
          daftarKlien={klien}
        />
      </div>

      {/*
        Ringkasan seluruh tahap. Tahap yang kosong tetap disebut — kalau tidak,
        tidak ada cara melihat bahwa tidak ada satu pun kandidat yang baru
        diajukan minggu ini, dan justru itu yang perlu diketahui.
      */}
      <div className="mb-6 rounded-lg border border-[var(--color-garis)] bg-white p-3">
        <div className="flex flex-wrap gap-2">
          {semuaTahap.map((t) => {
            const n = perTahap.get(t)?.length ?? 0
            return (
              <div
                key={t}
                className={`min-w-[5.5rem] grow basis-0 rounded-md px-2 py-2 text-center ${
                  n > 0 ? 'bg-[var(--color-permukaan)]' : 'opacity-50'
                }`}
              >
                <p className="angka text-lg leading-none font-semibold">{n}</p>
                <p className="mt-1 text-xs leading-tight text-[var(--color-redup)]">
                  {LABEL_TAHAP[t]}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {baris.length === 0 ? (
        <Kosong
          judul={adaPenyaring ? 'Tidak ada pengajuan yang cocok' : 'Belum ada pengajuan'}
          keterangan={
            adaPenyaring
              ? 'Coba ubah penyaringnya.'
              : lowongan.length === 0
                ? 'Buat lowongan lebih dulu, lalu kaitkan kandidat ke lowongan itu.'
                : 'Buka salah satu lowongan, lalu kaitkan kandidat di bagian bawah halamannya.'
          }
          aksi={
            adaPenyaring ? null : (
              <Link href="/lowongan">
                <Button>Buka daftar lowongan</Button>
              </Link>
            )
          }
        />
      ) : (
        <div className="space-y-8">
          {tahapBerisi.map((tahap) => {
            const isi = perTahap.get(tahap)!
            return (
              <section key={tahap}>
                <header className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <BadgeTahap tahap={tahap} />
                  <span className="angka text-sm font-medium text-[var(--color-redup)]">
                    {isi.length}
                  </span>
                  <p className="text-xs text-[var(--color-redup)]">{KETERANGAN_TAHAP[tahap]}</p>
                </header>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {isi.map((b) => (
                    <Link
                      key={b.id}
                      href={`/pengajuan/${b.id}`}
                      className="block rounded-lg border border-[var(--color-garis)] bg-white p-3 shadow-sm hover:border-[var(--color-utama)]"
                    >
                      <p className="text-sm font-medium">{b.candidateName}</p>
                      <p className="mt-0.5 text-xs text-[var(--color-redup)]">
                        {b.jobTitle} · {b.clientName}
                      </p>
                      <div className="mt-2 flex flex-wrap justify-between gap-x-3 text-xs text-[var(--color-redup)]">
                        <span>
                          {b.expectedSalary !== null ? (
                            <span className="angka">{formatRupiah(b.expectedSalary)}</span>
                          ) : (
                            'Ekspektasi gaji belum diisi'
                          )}
                        </span>
                        <span>Bergerak {formatWaktu(b.stageUpdatedAt)}</span>
                      </div>
                      {b.submittedAt ? (
                        <p className="mt-1 text-xs text-[var(--color-utama)]">
                          Diajukan {formatWaktu(b.submittedAt)} — proteksi berjalan
                        </p>
                      ) : null}
                    </Link>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}

      <p className="mt-8 text-xs text-[var(--color-redup)]">
        Tahap &ldquo;{LABEL_TAHAP.submitted_to_client}&rdquo; dan sesudahnya berarti kandidat sudah
        sampai ke klien dan masa proteksi 12 bulan sedang berjalan. Tahap yang tidak muncul di
        bawah berarti sedang kosong — jumlahnya tetap terlihat di baris atas.
      </p>
    </div>
  )
}
