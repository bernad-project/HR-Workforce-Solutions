import type { Metadata } from 'next'
import { FormMasuk } from './form-masuk'

export const metadata: Metadata = { title: 'Masuk · Modul Headhunter' }

export default function HalamanMasuk() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold">Modul Headhunter</h1>
          <p className="mt-1 text-sm text-[var(--color-redup)]">PT HR &amp; Workforce Solutions</p>
        </div>

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
