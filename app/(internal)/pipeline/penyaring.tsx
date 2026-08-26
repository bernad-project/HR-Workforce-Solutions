'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

export function PenyaringPipeline({
  cari,
  lowongan,
  klien,
  daftarLowongan,
  daftarKlien,
}: {
  cari: string
  lowongan: string
  klien: string
  daftarLowongan: { id: string; title: string; clientName: string }[]
  daftarKlien: { id: string; name: string }[]
}) {
  const router = useRouter()
  const sp = useSearchParams()
  const adaPenyaring = Boolean(cari || lowongan || klien)

  function terapkan(kunci: string, nilai: string) {
    const baru = new URLSearchParams(sp.toString())
    if (nilai) baru.set(kunci, nilai)
    else baru.delete(kunci)
    router.push(`/pipeline?${baru.toString()}`)
  }

  return (
    <form
      className="flex flex-wrap gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        terapkan('cari', String(new FormData(e.currentTarget).get('cari') ?? ''))
      }}
    >
      <Input
        name="cari"
        defaultValue={cari}
        placeholder="Cari nama kandidat atau jabatan"
        className="max-w-xs"
      />
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
        defaultValue={lowongan}
        className="max-w-[18rem]"
        onChange={(e) => terapkan('lowongan', e.currentTarget.value)}
      >
        <option value="">Semua lowongan</option>
        {daftarLowongan.map((l) => (
          <option key={l.id} value={l.id}>
            {l.title} — {l.clientName}
          </option>
        ))}
      </Select>
      <Button type="submit" variant="garis">
        Cari
      </Button>
      {adaPenyaring ? (
        <Button type="button" variant="halus" onClick={() => router.push('/pipeline')}>
          Bersihkan
        </Button>
      ) : null}
    </form>
  )
}
