'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InputRupiah } from '@/components/ui/input-rupiah'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Field, PesanGalat } from '@/components/ui/field'
import { PemberitahuanPdp } from '@/components/pemberitahuan-pdp'
import { JANGAN_DISIMPAN, RINGKASAN_PEMBERITAHUAN, SALURAN_PERSETUJUAN } from '@/lib/pdp'
import { KEADAAN_AWAL } from '@/lib/validation/umum'
import { SUMBER_KANDIDAT, STATUS_KANDIDAT } from '@/lib/validation/kandidat'
import type { Candidate } from '@/lib/db/schema'
import { simpanKandidatBaru, simpanPerubahanKandidat } from './aksi'

export function FormKandidat({ kandidat }: { kandidat?: Candidate }) {
  const menyunting = Boolean(kandidat)
  const [keadaan, kirim, sedangKirim] = useActionState(
    menyunting ? simpanPerubahanKandidat : simpanKandidatBaru,
    KEADAAN_AWAL,
  )
  const g = keadaan.galat
  // Isi yang tadi diketik dipasang kembali — lihat catatan di lib/validation/umum.ts
  const nilai = (nama: string, bawaan: string) => keadaan.nilai[nama] ?? bawaan
  const konfirmasi = keadaan.konfirmasi

  return (
    <form action={kirim} className="space-y-6">
      {kandidat ? <input type="hidden" name="id" value={kandidat.id} /> : null}
      <PesanGalat pesan={keadaan.pesan} />

      {konfirmasi ? (
        <div className="rounded-lg border border-[#f59e0b] bg-[#fef3c7] p-4">
          <p className="mb-2 text-sm font-medium text-[#92400e]">{konfirmasi.pesan}</p>
          <ul className="mb-3 space-y-1">
            {konfirmasi.serupa.map((s) => (
              <li key={s.id} className="text-sm">
                <Link
                  href={`/kandidat/${s.id}`}
                  className="font-medium text-[var(--color-utama)] hover:underline"
                >
                  {s.nama}
                </Link>
                {s.keterangan ? (
                  <span className="text-[var(--color-redup)]"> — {s.keterangan}</span>
                ) : null}
              </li>
            ))}
          </ul>
          {!menyunting ? (
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                name="abaikanSerupa"
                value="ya"
                defaultChecked={nilai('abaikanSerupa', '') === 'ya'}
                className="mt-1"
              />
              <span>
                Saya sudah memeriksa. Ini orang yang berbeda — buat kandidat baru.
              </span>
            </label>
          ) : null}
        </div>
      ) : null}

      {!menyunting ? <PemberitahuanPdp /> : null}

      <section className="rounded-lg border border-[var(--color-garis)] bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-[var(--color-redup)]">Identitas</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            htmlFor="fullName"
            label="Nama lengkap"
            wajib
            galat={g.fullName}
            className="sm:col-span-2"
          >
            <Input id="fullName" name="fullName" defaultValue={nilai('fullName', kandidat?.fullName ?? '')} required />
          </Field>

          <Field
            htmlFor="phone"
            label="Nomor WhatsApp"
            bantuan="Dipakai untuk mengenali kandidat kembar. 0812… dan +62812… dianggap sama."
            galat={g.phone}
          >
            <Input
              id="phone"
              name="phone"
              defaultValue={nilai('phone', kandidat?.phone ?? '')}
              placeholder="0812-3456-7890"
              className="angka"
            />
          </Field>

          <Field htmlFor="email" label="Email" galat={g.email}>
            <Input id="email" name="email" type="email" defaultValue={nilai('email', kandidat?.email ?? '')} />
          </Field>

          <Field htmlFor="domicileCity" label="Kota domisili" galat={g.domicileCity}>
            <Input
              id="domicileCity"
              name="domicileCity"
              defaultValue={nilai('domicileCity', kandidat?.domicileCity ?? '')}
              placeholder="Bekasi"
            />
          </Field>

          <Field htmlFor="education" label="Pendidikan terakhir" galat={g.education}>
            <Input
              id="education"
              name="education"
              defaultValue={nilai('education', kandidat?.education ?? '')}
              placeholder="S1 Manajemen, Universitas …"
            />
          </Field>
        </div>

        <p className="mt-4 text-xs text-[var(--color-redup)]">
          Sengaja tidak ada isian {JANGAN_DISIMPAN.join(', ')}. Semuanya belum diperlukan sampai
          tahap penawaran, dan data yang tidak disimpan tidak bisa bocor. Jangan menuliskannya di
          kotak catatan.
        </p>
      </section>

      <section className="rounded-lg border border-[var(--color-garis)] bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-[var(--color-redup)]">Pekerjaan</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field htmlFor="currentCompany" label="Perusahaan sekarang" galat={g.currentCompany}>
            <Input
              id="currentCompany"
              name="currentCompany"
              defaultValue={nilai('currentCompany', kandidat?.currentCompany ?? '')}
            />
          </Field>

          <Field htmlFor="currentTitle" label="Jabatan sekarang" galat={g.currentTitle}>
            <Input
              id="currentTitle"
              name="currentTitle"
              defaultValue={nilai('currentTitle', kandidat?.currentTitle ?? '')}
            />
          </Field>

          <Field htmlFor="yearsExperience" label="Total pengalaman (tahun)" galat={g.yearsExperience}>
            <Input
              id="yearsExperience"
              name="yearsExperience"
              defaultValue={nilai('yearsExperience', kandidat?.yearsExperience ?? '')}
              placeholder="5"
              className="angka"
              inputMode="decimal"
            />
          </Field>

          <Field
            htmlFor="noticePeriodDays"
            label="Masa pemberitahuan keluar (hari)"
            bantuan="Berapa lama sampai bisa mulai kerja di tempat baru."
            galat={g.noticePeriodDays}
          >
            <Input
              id="noticePeriodDays"
              name="noticePeriodDays"
              defaultValue={nilai('noticePeriodDays', kandidat?.noticePeriodDays?.toString() ?? '')}
              placeholder="30"
              className="angka"
              inputMode="numeric"
            />
          </Field>

          <Field
            htmlFor="currentSalary"
            label="Gaji sekarang"
            bantuan="Tidak pernah ditampilkan ke klien di portal."
            galat={g.currentSalary}
          >
            <InputRupiah
              id="currentSalary"
              name="currentSalary"
              defaultValue={nilai('currentSalary', kandidat?.currentSalary?.toString() ?? '')}
            />
          </Field>

          <Field
            htmlFor="expectedSalary"
            label="Ekspektasi gaji"
            bantuan="Kesenjangan gaji adalah penyebab kegagalan penempatan nomor satu — isi sedetail mungkin."
            galat={g.expectedSalary}
          >
            <InputRupiah
              id="expectedSalary"
              name="expectedSalary"
              defaultValue={nilai('expectedSalary', kandidat?.expectedSalary?.toString() ?? '')}
            />
          </Field>

          <Field
            htmlFor="skills"
            label="Keahlian"
            bantuan="Satu baris satu keahlian. Dipakai untuk mencari kandidat kembali nanti."
            galat={g.skills}
            className="sm:col-span-2"
          >
            <Textarea
              id="skills"
              name="skills"
              rows={4}
              defaultValue={nilai('skills', (kandidat?.skills ?? []).join('\n'))}
              placeholder={'Penjualan B2B\nNegosiasi\nManajemen tim'}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-lg border border-[var(--color-garis)] bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-[var(--color-redup)]">Sumber dan status</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field htmlFor="source" label="Dari mana kandidat ini" galat={g.source}>
            <Select id="source" name="source" defaultValue={nilai('source', kandidat?.source ?? 'other')}>
              {SUMBER_KANDIDAT.map((s) => (
                <option key={s.nilai} value={s.nilai}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field htmlFor="sourceDetail" label="Keterangan sumber" galat={g.sourceDetail}>
            <Input
              id="sourceDetail"
              name="sourceDetail"
              defaultValue={nilai('sourceDetail', kandidat?.sourceDetail ?? '')}
              placeholder="Rekomendasi Pak Andi"
            />
          </Field>

          <Field htmlFor="status" label="Status" galat={g.status}>
            <Select id="status" name="status" defaultValue={nilai('status', kandidat?.status ?? 'active')}>
              {STATUS_KANDIDAT.map((s) => (
                <option key={s.nilai} value={s.nilai}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            htmlFor="notes"
            label="Catatan internal"
            bantuan="Tidak pernah tampil di portal klien."
            galat={g.notes}
            className="sm:col-span-2"
          >
            <Textarea id="notes" name="notes" rows={3} defaultValue={nilai('notes', kandidat?.notes ?? '')} />
          </Field>
        </div>
      </section>

      {!menyunting ? (
        <section className="rounded-lg border border-[var(--color-garis)] bg-white p-5">
          <h2 className="mb-1 text-sm font-semibold text-[var(--color-redup)]">
            Catatan persetujuan
          </h2>
          <p className="mb-4 text-xs text-[var(--color-redup)]">
            Wajib diisi. Tanpa catatan ini, data kandidat tersimpan tanpa dasar yang bisa
            dipertanggungjawabkan bila suatu saat ditanya.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              htmlFor="persetujuanMethod"
              label="Persetujuan diperoleh lewat"
              wajib
              galat={g.persetujuanMethod}
            >
              <Select
                id="persetujuanMethod"
                name="persetujuanMethod"
                defaultValue={nilai('persetujuanMethod', 'whatsapp')}
              >
                {SALURAN_PERSETUJUAN.map((s) => (
                  <option key={s.nilai} value={s.nilai}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              htmlFor="persetujuanEvidence"
              label="Bukti persetujuan"
              wajib
              bantuan="Salin kalimat persetujuannya, atau tulis di mana tangkapan layarnya disimpan."
              galat={g.persetujuanEvidence}
              className="sm:col-span-2"
            >
              <Textarea
                id="persetujuanEvidence"
                name="persetujuanEvidence"
                rows={3}
                defaultValue={nilai('persetujuanEvidence', '')}
                placeholder='Balasan WhatsApp 25 Agu 2026: "Baik Pak, saya setuju data saya diproses dan dikirim ke perusahaan klien."'
                required
              />
            </Field>
          </div>

          <label className="mt-4 flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              id="persetujuanKonfirmasi"
              name="persetujuanKonfirmasi"
              value="ya"
              /* Kotak centang juga ikut dikosongkan React setelah aksi selesai. */
              defaultChecked={nilai('persetujuanKonfirmasi', '') === 'ya'}
              className="mt-1"
              required
            />
            <span>{RINGKASAN_PEMBERITAHUAN}</span>
          </label>
          {g.persetujuanKonfirmasi ? (
            <p className="mt-1 text-xs text-[var(--color-bahaya)]" role="alert">
              {g.persetujuanKonfirmasi}
            </p>
          ) : null}
        </section>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={sedangKirim}>
          {sedangKirim ? 'Menyimpan...' : menyunting ? 'Simpan perubahan' : 'Simpan kandidat'}
        </Button>
        <Link href={kandidat ? `/kandidat/${kandidat.id}` : '/kandidat'}>
          <Button type="button" variant="garis">
            Batal
          </Button>
        </Link>
      </div>
    </form>
  )
}
