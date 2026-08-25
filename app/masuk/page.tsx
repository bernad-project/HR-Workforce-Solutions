import type { Metadata } from 'next'
import { adaAkunStaf } from '@/lib/db/queries/pengguna'
import { FormMasuk } from './form-masuk'

export const metadata: Metadata = { title: 'Masuk · Modul Headhunter' }

// Keadaan "sudah ada akun atau belum" bisa berubah di luar aplikasi, jadi
// halaman ini dibaca segar, bukan dari cache.
export const dynamic = 'force-dynamic'

export default async function HalamanMasuk() {
  const adaAkun = await adaAkunStaf()

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold">Modul Headhunter</h1>
          <p className="mt-1 text-sm text-[var(--color-redup)]">PT HR &amp; Workforce Solutions</p>
        </div>

        {adaAkun ? null : (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-[#f59e0b] bg-[#fef3c7] p-4 text-sm text-[#92400e]"
          >
            <p className="font-medium">Belum ada satu akun pun di sistem ini.</p>
            <p className="mt-1">
              Tabelnya sudah siap, tapi akun pemiliknya gagal dibuat. Penyebab tersering: isi
              <span className="angka"> OWNER_PASSWORD </span>
              kurang dari 12 karakter.
            </p>
            <p className="mt-2">
              Di Vercel, buka Settings → Environment Variables, perbaiki nilainya, lalu jalankan
              Redeploy sekali. Akun Anda dibuat otomatis pada penempatan itu.
            </p>
          </div>
        )}

        <div className="rounded-lg border border-[var(--color-garis)] bg-white p-6 shadow-sm">
          <FormMasuk />
        </div>

        <p className="mt-6 text-center text-xs text-[var(--color-redup)]">
          Halaman ini untuk staf internal. PIC klien masuk lewat tautan yang dikirim ke email.
        </p>
      </div>
    </main>
  )
}
