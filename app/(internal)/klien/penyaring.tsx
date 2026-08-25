'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { STATUS_KLIEN } from '@/lib/validation/klien'

export function PenyaringKlien({ cari, status }: { cari: string; status: string }) {
  const router = useRouter()
  const sp = useSearchParams()
  const adaPenyaring = Boolean(cari || status)

  function terapkan(kunci: string, nilai: string) {
    const baru = new URLSearchParams(sp.toString())
    if (nilai) baru.set(kunci, nilai)
    else baru.delete(kunci)
    router.push(`/klien?${baru.toString()}`)
  }

  return (
    <form
      className="flex flex-wrap gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        const data = new FormData(e.currentTarget)
        terapkan('cari', String(data.get('cari') ?? ''))
      }}
    >
      <Input
        name="cari"
        defaultValue={cari}
        placeholder="Cari nama perusahaan atau PIC"
        className="max-w-xs"
      />
      <Select
        name="status"
        defaultValue={status}
        className="max-w-[12rem]"
        onChange={(e) => terapkan('status', e.currentTarget.value)}
      >
        <option value="">Semua status</option>
        {STATUS_KLIEN.map((s) => (
          <option key={s.nilai} value={s.nilai}>
            {s.label}
          </option>
        ))}
      </Select>
      <Button type="submit" variant="garis">
        Cari
      </Button>
      {adaPenyaring ? (
        <Button type="button" variant="halus" onClick={() => router.push('/klien')}>
          Bersihkan
        </Button>
      ) : null}
    </form>
  )
}
