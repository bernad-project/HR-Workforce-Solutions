'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Field, PesanGalat } from '@/components/ui/field'
import { KEADAAN_AWAL } from '@/lib/validation/umum'
import { simpanPerjanjian } from '../../../aksi'

export function FormPerjanjian({
  clientId,
  bawaan,
}: {
  clientId: string
  bawaan: {
    feePercent: string
    guaranteeDays: number
    paymentTermsDays: number
    protectionMonths: number
  }
}) {
  const [keadaan, kirim, sedangKirim] = useActionState(simpanPerjanjian, KEADAAN_AWAL)
  const g = keadaan.galat
  // Isi yang tadi diketik dipasang kembali — lihat catatan di lib/validation/umum.ts
  const nilai = (nama: string, bawaan: string) => keadaan.nilai[nama] ?? bawaan

  return (
    <form action={kirim} className="space-y-6">
      <input type="hidden" name="clientId" value={clientId} />
      <PesanGalat pesan={keadaan.pesan} />

      <section className="rounded-lg border border-[var(--color-garis)] bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-[var(--color-redup)]">Dokumen</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field htmlFor="agreementNumber" label="Nomor perjanjian" galat={g.agreementNumber}>
            <Input
              id="agreementNumber"
              name="agreementNumber"
              defaultValue={nilai('agreementNumber', '')}
              placeholder="PKS/2026/001"
            />
          </Field>
          <Field htmlFor="signedDate" label="Tanggal ditandatangani" galat={g.signedDate}>
            <Input id="signedDate" name="signedDate" type="date" defaultValue={nilai('signedDate', '')} />
          </Field>
          <Field htmlFor="startDate" label="Berlaku mulai" galat={g.startDate}>
            <Input id="startDate" name="startDate" type="date" defaultValue={nilai('startDate', '')} />
          </Field>
          <Field htmlFor="endDate" label="Berlaku sampai" galat={g.endDate}>
            <Input id="endDate" name="endDate" type="date" defaultValue={nilai('endDate', '')} />
          </Field>
        </div>
      </section>

      <section className="rounded-lg border border-[var(--color-garis)] bg-white p-5">
        <h2 className="mb-1 text-sm font-semibold text-[var(--color-redup)]">Ketentuan komersial</h2>
        <p className="mb-4 text-xs text-[var(--color-redup)]">
          Angka di sini disalin ke setiap penempatan pada saat penempatan dibuat. Kalau tahun depan
          persentase fee klien ini berubah, tagihan lama tetap memakai angka yang berlaku waktu itu.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            htmlFor="feePercent"
            label="Persentase fee"
            wajib
            bantuan="Dihitung dari gaji pokok setahun. Wajar 12%–20%; sistem menolak di luar 10%–30%."
            galat={g.feePercent}
          >
            <div className="relative">
              <Input
                id="feePercent"
                name="feePercent"
                defaultValue={nilai('feePercent', bawaan.feePercent)}
                className="angka pr-8"
                inputMode="decimal"
                required
              />
              <span className="absolute top-1/2 right-3 -translate-y-1/2 text-sm text-[var(--color-redup)]">
                %
              </span>
            </div>
          </Field>

          <Field
            htmlFor="splitFirstPercent"
            label="Porsi tagihan pertama"
            bantuan="Sisanya jadi tagihan kedua. Jumlah keduanya selalu persis sama dengan nilai fee."
            galat={g.splitFirstPercent}
          >
            <div className="relative">
              <Input
                id="splitFirstPercent"
                name="splitFirstPercent"
                defaultValue={nilai('splitFirstPercent', '50')}
                className="angka pr-8"
                inputMode="decimal"
              />
              <span className="absolute top-1/2 right-3 -translate-y-1/2 text-sm text-[var(--color-redup)]">
                %
              </span>
            </div>
          </Field>

          <Field
            htmlFor="guaranteeDays"
            label="Masa garansi penggantian (hari)"
            bantuan="Bila kandidat berhenti sebelum masa ini habis, kita ganti sekali tanpa fee baru."
            galat={g.guaranteeDays}
          >
            <Input
              id="guaranteeDays"
              name="guaranteeDays"
              defaultValue={nilai('guaranteeDays', String(bawaan.guaranteeDays))}
              className="angka"
              inputMode="numeric"
            />
          </Field>

          <Field
            htmlFor="paymentTermsDays"
            label="Tempo pembayaran (hari)"
            bantuan="Dihitung sejak tanggal tagihan terbit."
            galat={g.paymentTermsDays}
          >
            <Input
              id="paymentTermsDays"
              name="paymentTermsDays"
              defaultValue={nilai('paymentTermsDays', String(bawaan.paymentTermsDays))}
              className="angka"
              inputMode="numeric"
            />
          </Field>

          <Field
            htmlFor="protectionMonths"
            label="Masa proteksi kandidat (bulan)"
            bantuan="Pasal 4 perjanjian: klien tidak boleh merekrut kandidat yang kita ajukan lewat jalur lain selama masa ini. Ini yang melindungi pendapatan."
            galat={g.protectionMonths}
            className="sm:col-span-2"
          >
            <Input
              id="protectionMonths"
              name="protectionMonths"
              defaultValue={nilai('protectionMonths', String(bawaan.protectionMonths))}
              className="angka max-w-[10rem]"
              inputMode="numeric"
            />
          </Field>
        </div>
      </section>

      <section className="rounded-lg border border-[var(--color-garis)] bg-white p-5">
        <Field htmlFor="notes" label="Catatan" galat={g.notes}>
          <Textarea id="notes" name="notes" rows={3} defaultValue={nilai('notes', '')} />
        </Field>
      </section>

      <div className="flex gap-2">
        <Button type="submit" disabled={sedangKirim}>
          {sedangKirim ? 'Menyimpan...' : 'Simpan perjanjian'}
        </Button>
        <Link href={`/klien/${clientId}`}>
          <Button type="button" variant="garis">
            Batal
          </Button>
        </Link>
      </div>
    </form>
  )
}
