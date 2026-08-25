import type { Metadata } from 'next'
import { JudulHalaman } from '@/components/halaman'
import { FormKandidat } from '../form-kandidat'

export const metadata: Metadata = { title: 'Kandidat baru · Modul Headhunter' }

export default function HalamanKandidatBaru() {
  return (
    <div className="max-w-3xl">
      <JudulHalaman
        judul="Kandidat baru"
        keterangan="CV bisa diunggah setelah kandidat tersimpan."
        kembali={{ href: '/kandidat', label: 'Daftar kandidat' }}
      />
      <FormKandidat />
    </div>
  )
}
