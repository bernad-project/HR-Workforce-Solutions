import type { Metadata } from 'next'
import { JudulHalaman } from '@/components/halaman'
import { FormKlien } from '../form-klien'

export const metadata: Metadata = { title: 'Klien baru · Modul Headhunter' }

export default function HalamanKlienBaru() {
  return (
    <div className="max-w-3xl">
      <JudulHalaman judul="Klien baru" kembali={{ href: '/klien', label: 'Daftar klien' }} />
      <FormKlien />
    </div>
  )
}
