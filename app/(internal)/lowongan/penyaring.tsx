'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { STATUS_LOWONGAN } from '@/lib/validation/lowongan'

export function PenyaringLowongan({
  cari,
  status,
  klien,
  daftarKlien,
}: {
  cari: string
  status: string
  klien: string
  daftarKlien: { id: string; name: string }[]
}) {
  const router = useRouter()
  const sp = useSearchParams()
  const adaPenyaring = Boolean(cari || status || klien)

  function terapkan(kunci: string, nilai: string) {
    const baru = new URLSearchParams(sp.toString())
    if (nilai) baru.set(kunci, nilai)
    else baru.delete(kunci)
    router.push(`/lowongan?${baru.toString()}`)
  }

  return (
    <form
      className="flex flex-wrap gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        terapkan('cari', String(new FormData(e.currentTarget).get('cari') ?? ''))
      }}
    >
      <Input name="cari" defaultValue={cari} placeholder="Cari nama jabatan" className="max-w-xs" />
      <Select
        defaultValue={klien}
        className="max-w-[14rem]"
        onChange={(e) => terapkan('klien', e.currentTarget.value)}
      >
        <option value="">Semua klien</option>
        {daftarKlien.map((k) => (
          <option key={k.id} value={k.id}>
            {k.name}
          </option>
        ))}
      </Select>
      <Select
        defaultValue={status}
        className="max-w-[11rem]"
        onChange={(e) => terapkan('status', e.currentTarget.value)}
      >
        <option value="">Semua status</option>
        {STATUS_LOWONGAN.map((s) => (
          <option key={s.nilai} value={s.nilai}>
            {s.label}
          </option>
        ))}
      </Select>
      <Button type="submit" variant="garis">
        Cari
      </Button>
      {adaPenyaring ? (
        <Button type="button" variant="halus" onClick={() => router.push('/lowongan')}>
          Bersihkan
        </Button>
      ) : null}
    </form>
  )
}
