import type { Metadata } from 'next'
import {
  keadaanPengaturan,
  pengaturanTambahanYangKurang,
  pengaturanYangKurang,
  PENGATURAN_TAMBAHAN,
  PENGATURAN_WAJIB,
} from '@/lib/konfigurasi'

const LABEL_KEADAAN = {
  terisi: 'sudah terisi',
  tidak_ada: 'belum ada',
  kosong: 'ada, tapi nilainya kosong',
} as const

export const metadata: Metadata = { title: 'Persiapan · Modul Headhunter' }

// Dibaca segar setiap kali, karena isinya bergantung pada pengaturan yang bisa
// berubah kapan saja di Vercel.
export const dynamic = 'force-dynamic'

/**
 * Halaman yang tampil selama pengaturan wajib belum terisi.
 *
 * Tanpa halaman ini, sistem yang baru ditempatkan akan menampilkan pesan galat
 * yang tidak berguna bagi pemiliknya. Halaman ini menyebutkan apa yang kurang
 * dan langkah persisnya — tanpa perlu membuka terminal.
 */
export default function HalamanPersiapan() {
  const kurang = pengaturanYangKurang()
  const kurangTambahan = pengaturanTambahanYangKurang()
  const namaKurang = new Set(kurang.map((k) => k.nama))
  const namaKurangTambahan = new Set(kurangTambahan.map((k) => k.nama))

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-xl font-semibold">Modul Headhunter</h1>
      <p className="mt-1 text-sm text-[var(--color-redup)]">PT HR &amp; Workforce Solutions</p>

      <div className="mt-8 rounded-lg border border-[#f59e0b] bg-[#fef3c7] p-5">
        <p className="text-sm font-medium text-[#92400e]">
          Sistemnya sudah terpasang, tapi belum bisa dipakai.
        </p>
        <p className="mt-1 text-sm text-[#92400e]">
          Ada {kurang.length} pengaturan yang masih kosong. Setelah diisi di Vercel, jalankan
          penempatan ulang sekali — sisanya berjalan sendiri, termasuk pembuatan tabel dan akun
          pemilik pertama.
        </p>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-redup)]">
          Wajib diisi sebelum sistem bisa dibuka
        </h2>
        <ol className="space-y-4">
          {PENGATURAN_WAJIB.map((p, i) => {
            const belum = namaKurang.has(p.nama)
            const keadaan = keadaanPengaturan(p.nama)
            return (
              <li
                key={p.nama}
                className={`rounded-lg border bg-white p-4 ${
                  belum ? 'border-[var(--color-garis)]' : 'border-[#bbf7d0]'
                }`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium">
                    {i + 1}. {p.judul}
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      belum
                        ? 'bg-[var(--color-bahaya-redup)] text-[var(--color-bahaya)]'
                        : 'bg-[#dcfce7] text-[var(--color-aman)]'
                    }`}
                  >
                    {LABEL_KEADAAN[keadaan]}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[var(--color-redup)]">{p.keterangan}</p>
                {keadaan === 'kosong' ? (
                  <p className="mt-2 rounded-md bg-[#fef3c7] p-3 text-sm text-[#92400e]">
                    Variabel <span className="angka">{p.nama}</span> sudah ada di Vercel, tapi
                    nilainya kosong. Itu sebabnya Vercel menolak saat Anda mencoba menambahkannya
                    lagi. Buka Settings → Environment Variables, klik ⋯ di baris{' '}
                    <span className="angka">{p.nama}</span> → Edit, isi kolom Value-nya, lalu Save
                    dan jalankan Redeploy.
                  </p>
                ) : belum ? (
                  <p className="mt-2 rounded-md bg-[var(--color-permukaan)] p-3 text-sm">
                    {p.caraMengisi}
                  </p>
                ) : null}
              </li>
            )
          })}
        </ol>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-redup)]">
          Sebaiknya diisi juga, supaya Anda langsung bisa masuk
        </h2>
        <ol className="space-y-4">
          {PENGATURAN_TAMBAHAN.map((p) => {
            const belum = namaKurangTambahan.has(p.nama)
            return (
              <li key={p.nama} className="rounded-lg border border-[var(--color-garis)] bg-white p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium">{p.judul}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      belum
                        ? 'bg-[var(--color-permukaan)] text-[var(--color-redup)]'
                        : 'bg-[#dcfce7] text-[var(--color-aman)]'
                    }`}
                  >
                    {LABEL_KEADAAN[keadaanPengaturan(p.nama)]}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[var(--color-redup)]">{p.keterangan}</p>
              </li>
            )
          })}
        </ol>
      </section>

      <p className="mt-8 text-xs text-[var(--color-redup)]">
        Halaman ini hilang dengan sendirinya begitu kedua pengaturan wajib terisi. Nilai
        pengaturannya tidak pernah ditampilkan di sini — yang terlihat hanya sudah terisi atau
        belum.
      </p>
    </main>
  )
}
