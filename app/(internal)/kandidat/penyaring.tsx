'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { STATUS_KANDIDAT } from '@/lib/validation/kandidat'

export function PenyaringKandidat({
  cari,
  keahlian,
  status,
  kota,
  daftarKota,
}: {
  cari: string
  keahlian: string
  status: string
  kota: string
  daftarKota: string[]
}) {
  const router = useRouter()
  const sp = useSearchParams()
  const adaPenyaring = Boolean(cari || keahlian || status || kota)

  function terapkan(perubahan: Record<string, string>) {
    const baru = new URLSearchParams(sp.toString())
    for (const [kunci, nilai] of Object.entries(perubahan)) {
      if (nilai) baru.set(kunci, nilai)
      else baru.delete(kunci)
    }
    router.push(`/kandidat?${baru.toString()}`)
  }

  return (
    <form
      className="flex flex-wrap gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        const data = new FormData(e.currentTarget)
        terapkan({
          cari: String(data.get('cari') ?? ''),
          keahlian: String(data.get('keahlian') ?? ''),
        })
      }}
    >
      <Input
        name="cari"
        defaultValue={cari}
        placeholder="Nama, perusahaan, jabatan, telepon, email"
        className="max-w-xs"
      />
      <Input
        name="keahlian"
        defaultValue={keahlian}
        placeholder="Keahlian persis, mis. Excel"
        className="max-w-[14rem]"
      />
      <Select
        defaultValue={kota}
        className="max-w-[12rem]"
        onChange={(e) => terapkan({ kota: e.currentTarget.value })}
      >
        <option value="">Semua domisili</option>
        {daftarKota.map((k) => (
          <option key={k} value={k}>
            {k}
          </option>
        ))}
      </Select>
      <Select
        defaultValue={status}
        className="max-w-[11rem]"
        onChange={(e) => terapkan({ status: e.currentTarget.value })}
      >
        <option value="">Semua status</option>
        {STATUS_KANDIDAT.map((s) => (
          <option key={s.nilai} value={s.nilai}>
            {s.label}
          </option>
        ))}
      </Select>
      <Button type="submit" variant="garis">
        Cari
      </Button>
      {adaPenyaring ? (
        <Button type="button" variant="halus" onClick={() => router.push('/kandidat')}>
          Bersihkan
        </Button>
      ) : null}
    </form>
  )
}
