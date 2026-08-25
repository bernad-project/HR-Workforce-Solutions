'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Field, PesanGalat } from '@/components/ui/field'
import { STATUS_KLIEN } from '@/lib/validation/klien'
import { KEADAAN_AWAL } from '@/lib/validation/umum'
import type { Client } from '@/lib/db/schema'
import { simpanKlien } from './aksi'

export function FormKlien({ klien }: { klien?: Client }) {
  const [keadaan, kirim, sedangKirim] = useActionState(simpanKlien, KEADAAN_AWAL)
  const g = keadaan.galat
  // Isi yang tadi diketik dipasang kembali — lihat catatan di lib/validation/umum.ts
  const nilai = (nama: string, bawaan: string) => keadaan.nilai[nama] ?? bawaan

  return (
    <form action={kirim} className="space-y-6">
      {klien ? <input type="hidden" name="id" value={klien.id} /> : null}
      <PesanGalat pesan={keadaan.pesan} />

      <section className="rounded-lg border border-[var(--color-garis)] bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-[var(--color-redup)]">Perusahaan</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field htmlFor="name" label="Nama perusahaan" wajib galat={g.name} className="sm:col-span-2">
            <Input id="name" name="name" defaultValue={nilai('name', klien?.name ?? '')} required />
          </Field>

          <Field htmlFor="industry" label="Industri" galat={g.industry}>
            <Input
              id="industry"
              name="industry"
              defaultValue={nilai('industry', klien?.industry ?? '')}
              placeholder="Manufaktur, ritel, jasa keuangan…"
            />
          </Field>

          <Field htmlFor="status" label="Status" galat={g.status}>
            <Select id="status" name="status" defaultValue={nilai('status', klien?.status ?? 'prospect')}>
              {STATUS_KLIEN.map((s) => (
                <option key={s.nilai} value={s.nilai}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field htmlFor="npwp" label="NPWP perusahaan" galat={g.npwp}>
            <Input id="npwp" name="npwp" defaultValue={nilai('npwp', klien?.npwp ?? '')} className="angka" />
          </Field>

          <Field htmlFor="address" label="Alamat" galat={g.address}>
            <Input id="address" name="address" defaultValue={nilai('address', klien?.address ?? '')} />
          </Field>
        </div>
      </section>

      <section className="rounded-lg border border-[var(--color-garis)] bg-white p-5">
        <h2 className="mb-1 text-sm font-semibold text-[var(--color-redup)]">
          Penanggung jawab (PIC)
        </h2>
        <p className="mb-4 text-xs text-[var(--color-redup)]">
          Orang di perusahaan klien yang jadi lawan bicara. Emailnya nanti dipakai untuk mengirim
          tautan portal klien.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field htmlFor="picName" label="Nama PIC" galat={g.picName}>
            <Input id="picName" name="picName" defaultValue={nilai('picName', klien?.picName ?? '')} />
          </Field>

          <Field htmlFor="picTitle" label="Jabatan PIC" galat={g.picTitle}>
            <Input
              id="picTitle"
              name="picTitle"
              defaultValue={nilai('picTitle', klien?.picTitle ?? '')}
              placeholder="HR Manager, Direktur…"
            />
          </Field>

          <Field htmlFor="picPhone" label="Nomor WhatsApp PIC" galat={g.picPhone}>
            <Input
              id="picPhone"
              name="picPhone"
              defaultValue={nilai('picPhone', klien?.picPhone ?? '')}
              placeholder="0812-3456-7890"
              className="angka"
            />
          </Field>

          <Field htmlFor="picEmail" label="Email PIC" galat={g.picEmail}>
            <Input id="picEmail" name="picEmail" type="email" defaultValue={nilai('picEmail', klien?.picEmail ?? '')} />
          </Field>
        </div>
      </section>

      <section className="rounded-lg border border-[var(--color-garis)] bg-white p-5">
        <Field
          htmlFor="notes"
          label="Catatan internal"
          bantuan="Hanya terlihat oleh tim kita. Tidak pernah tampil di portal klien."
          galat={g.notes}
        >
          <Textarea id="notes" name="notes" rows={3} defaultValue={nilai('notes', klien?.notes ?? '')} />
        </Field>
      </section>

      <div className="flex gap-2">
        <Button type="submit" disabled={sedangKirim}>
          {sedangKirim ? 'Menyimpan...' : klien ? 'Simpan perubahan' : 'Simpan klien'}
        </Button>
        <Link href={klien ? `/klien/${klien.id}` : '/klien'}>
          <Button type="button" variant="garis">
            Batal
          </Button>
        </Link>
      </div>
    </form>
  )
}
