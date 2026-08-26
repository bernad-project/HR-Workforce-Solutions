'use client'

import { useActionState, useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InputRupiah } from '@/components/ui/input-rupiah'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Field, PesanGalat } from '@/components/ui/field'
import { KEADAAN_AWAL } from '@/lib/validation/umum'
import { JENIS_HUBUNGAN_KERJA, POLA_KERJA, STATUS_LOWONGAN } from '@/lib/validation/lowongan'
import type { Job } from '@/lib/db/schema'
import { simpanLowongan } from './aksi'

export type PilihanPerjanjian = {
  id: string
  clientId: string
  label: string
  isActive: boolean
}

export function FormLowongan({
  lowongan,
  daftarKlien,
  daftarPerjanjian,
  klienAwal,
  bolehPilihPerjanjian,
}: {
  lowongan?: Job
  daftarKlien: { id: string; name: string }[]
  daftarPerjanjian: PilihanPerjanjian[]
  klienAwal?: string
  /** Hanya pemilik yang boleh memilih perjanjian mana yang dipakai. */
  bolehPilihPerjanjian: boolean
}) {
  const [keadaan, kirim, sedangKirim] = useActionState(simpanLowongan, KEADAAN_AWAL)
  const g = keadaan.galat
  // Isi yang tadi diketik dipasang kembali — lihat catatan di lib/validation/umum.ts
  const nilai = (nama: string, bawaan: string) => keadaan.nilai[nama] ?? bawaan

  const klienBawaan = nilai('clientId', lowongan?.clientId ?? klienAwal ?? '')
  const statusBawaan = nilai('status', lowongan?.status ?? 'draft')

  /**
   * Kedua kotak pilihan di bawah sengaja TIDAK dikendalikan React.
   *
   * React 19 mengembalikan isian form ke nilai bawaannya setelah server action
   * selesai, dan ia melakukannya langsung ke DOM tanpa memberi tahu state-nya
   * sendiri. Pada isian terkendali, akibatnya state React dan yang terlihat di
   * layar jadi berbeda — pilihan klien tampak kosong padahal React mengira masih
   * terisi, dan kiriman berikutnya membawa nilai kosong. Karena itu DOM yang
   * dijadikan sumber kebenaran; state di sini hanya untuk mengatur tampilan.
   */
  const [clientId, setClientId] = useState(klienBawaan)
  const [status, setStatus] = useState<string>(statusBawaan)

  useEffect(() => {
    setClientId(klienBawaan)
    setStatus(statusBawaan)
  }, [klienBawaan, statusBawaan])

  const perjanjianKlien = daftarPerjanjian.filter((p) => p.clientId === clientId)
  const perjanjianAktif = perjanjianKlien.find((p) => p.isActive)
  const perjanjianTerpilih = lowongan?.agreementId ?? perjanjianAktif?.id ?? ''

  const akanDibuka = status === 'open'

  return (
    <form action={kirim} className="space-y-6">
      {lowongan ? <input type="hidden" name="id" value={lowongan.id} /> : null}
      {!bolehPilihPerjanjian ? (
        <input type="hidden" name="agreementId" value={perjanjianTerpilih} />
      ) : null}
      <PesanGalat pesan={keadaan.pesan} />

      <section className="rounded-lg border border-[var(--color-garis)] bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-[var(--color-redup)]">Kebutuhan</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field htmlFor="clientId" label="Klien" wajib galat={g.clientId}>
            <Select
              id="clientId"
              name="clientId"
              defaultValue={klienBawaan}
              onChange={(e) => setClientId(e.currentTarget.value)}
              required
            >
              <option value="">Pilih klien</option>
              {daftarKlien.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}
                </option>
              ))}
            </Select>
          </Field>

          {bolehPilihPerjanjian ? (
            <Field
              htmlFor="agreementId"
              label="Perjanjian yang dipakai"
              bantuan="Menentukan fee, masa garansi, dan masa proteksi kandidat untuk lowongan ini."
              galat={g.agreementId}
            >
              <Select
                id="agreementId"
                name="agreementId"
                defaultValue={nilai('agreementId', perjanjianTerpilih)}
                key={clientId}
              >
                <option value="">Belum ditentukan</option>
                {perjanjianKlien.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}

          <Field htmlFor="title" label="Nama jabatan" wajib galat={g.title}>
            <Input
              id="title"
              name="title"
              defaultValue={nilai('title', lowongan?.title ?? '')}
              placeholder="Sales Manager"
              required
            />
          </Field>

          <Field htmlFor="headcount" label="Jumlah dibutuhkan" galat={g.headcount}>
            <Input
              id="headcount"
              name="headcount"
              defaultValue={nilai('headcount', String(lowongan?.headcount ?? 1))}
              className="angka"
              inputMode="numeric"
            />
          </Field>

          <Field htmlFor="location" label="Lokasi kerja" galat={g.location}>
            <Input
              id="location"
              name="location"
              defaultValue={nilai('location', lowongan?.location ?? '')}
              placeholder="Jakarta Selatan"
            />
          </Field>

          <Field htmlFor="department" label="Departemen / divisi" galat={g.department}>
            <Input
              id="department"
              name="department"
              defaultValue={nilai('department', lowongan?.department ?? '')}
              placeholder="Penjualan"
            />
          </Field>

          <Field
            htmlFor="reportsTo"
            label="Atasan langsung"
            bantuan="Jabatannya, bukan namanya — nama orang berganti, jabatannya tidak."
            galat={g.reportsTo}
          >
            <Input
              id="reportsTo"
              name="reportsTo"
              defaultValue={nilai('reportsTo', lowongan?.reportsTo ?? '')}
              placeholder="Direktur Penjualan"
            />
          </Field>

          <Field htmlFor="workArrangement" label="Pola kerja" galat={g.workArrangement}>
            <Select
              id="workArrangement"
              name="workArrangement"
              defaultValue={nilai('workArrangement', lowongan?.workArrangement ?? '')}
            >
              <option value="">Belum ditentukan</option>
              {POLA_KERJA.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </Field>

          <Field htmlFor="employmentType" label="Status hubungan kerja" galat={g.employmentType}>
            <Select
              id="employmentType"
              name="employmentType"
              defaultValue={nilai('employmentType', lowongan?.employmentType ?? '')}
            >
              <option value="">Belum ditentukan</option>
              {JENIS_HUBUNGAN_KERJA.map((j) => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            htmlFor="salaryMin"
            label="Gaji pokok minimal"
            bantuan="Gaji POKOK per bulan — bukan take-home pay, bukan total paket."
            galat={g.salaryMin}
          >
            <InputRupiah
              id="salaryMin"
              name="salaryMin"
              defaultValue={nilai('salaryMin', lowongan?.salaryMin?.toString() ?? '')}
            />
          </Field>

          <Field htmlFor="salaryMax" label="Gaji pokok maksimal" galat={g.salaryMax}>
            <InputRupiah
              id="salaryMax"
              name="salaryMax"
              defaultValue={nilai('salaryMax', lowongan?.salaryMax?.toString() ?? '')}
            />
          </Field>

          <Field htmlFor="targetStartDate" label="Target mulai kerja" galat={g.targetStartDate}>
            <Input
              id="targetStartDate"
              name="targetStartDate"
              type="date"
              defaultValue={nilai('targetStartDate', lowongan?.targetStartDate ?? '')}
            />
          </Field>

          <Field htmlFor="status" label="Status lowongan" galat={g.status}>
            <Select
              id="status"
              name="status"
              defaultValue={statusBawaan}
              onChange={(e) => setStatus(e.currentTarget.value)}
            >
              {STATUS_LOWONGAN.map((s) => (
                <option key={s.nilai} value={s.nilai}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </section>

      {/*
        SPEC §6.3 menyebut ini "field paling bernilai", dan memang begitu:
        jawabannya sering berbeda dari deskripsi jabatan tertulis, dan itulah yang
        memberi tahu apa yang sebenarnya dicari klien. Karena itu ia diberi
        kotaknya sendiri, bukan diselipkan di antara isian lain.
      */}
      <section
        className={`rounded-lg border-2 bg-white p-5 ${
          akanDibuka && !lowongan?.reasonPreviousFailed
            ? 'border-[var(--color-utama)]'
            : 'border-[var(--color-garis)]'
        }`}
      >
        <Field
          htmlFor="reasonPreviousFailed"
          label="Apa yang membuat kandidat sebelumnya tidak cocok atau tidak jadi masuk?"
          wajib={akanDibuka}
          bantuan={
            <>
              Jawaban ini biasanya lebih jujur daripada deskripsi jabatan. Contoh: &ldquo;kandidat
              sebelumnya kuat di produk tapi tidak terbiasa kelola tim&rdquo;.
              {akanDibuka ? (
                <strong className="block text-[var(--color-utama)]">
                  Wajib diisi sebelum lowongan bisa berstatus Terbuka.
                </strong>
              ) : null}
            </>
          }
          galat={g.reasonPreviousFailed}
        >
          <Textarea
            id="reasonPreviousFailed"
            name="reasonPreviousFailed"
            rows={3}
            defaultValue={nilai('reasonPreviousFailed', lowongan?.reasonPreviousFailed ?? '')}
          />
        </Field>

        <div className="mt-4">
          <Field
            htmlFor="vacancyAgeNote"
            label="Sudah kosong berapa lama?"
            galat={g.vacancyAgeNote}
          >
            <Input
              id="vacancyAgeNote"
              name="vacancyAgeNote"
              defaultValue={nilai('vacancyAgeNote', lowongan?.vacancyAgeNote ?? '')}
              placeholder="3 bulan, sejak orang sebelumnya resign"
            />
          </Field>
        </div>
      </section>

      <section className="rounded-lg border border-[var(--color-garis)] bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-[var(--color-redup)]">Isi pekerjaan</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            htmlFor="mainDuties"
            label="Tugas utama sehari-hari"
            bantuan="Satu baris satu tugas. Ini yang dibacakan ke kandidat saat menawarkan posisinya."
            galat={g.mainDuties}
          >
            <Textarea
              id="mainDuties"
              name="mainDuties"
              rows={5}
              defaultValue={nilai('mainDuties', (lowongan?.mainDuties ?? []).join('\n'))}
              placeholder={'Mencari dan menutup penjualan ke pelanggan korporat\nMenyusun laporan penjualan bulanan'}
            />
          </Field>

          <Field
            htmlFor="benefits"
            label="Tunjangan di luar gaji pokok"
            bantuan="Satu baris satu tunjangan. Sering menjadi penentu kandidat mau pindah atau tidak."
            galat={g.benefits}
          >
            <Textarea
              id="benefits"
              name="benefits"
              rows={5}
              defaultValue={nilai('benefits', (lowongan?.benefits ?? []).join('\n'))}
              placeholder={'Tunjangan transportasi Rp1.000.000\nBPJS Kesehatan dan Ketenagakerjaan\nBonus tahunan 1x gaji'}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-lg border border-[var(--color-garis)] bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-[var(--color-redup)]">Kriteria</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            htmlFor="mustHave"
            label="Syarat wajib"
            bantuan="Satu baris satu syarat."
            galat={g.mustHave}
          >
            <Textarea
              id="mustHave"
              name="mustHave"
              rows={5}
              defaultValue={nilai('mustHave', (lowongan?.mustHave ?? []).join('\n'))}
              placeholder={'Minimal 5 tahun di penjualan B2B\nPernah memimpin tim minimal 3 orang'}
            />
          </Field>

          <Field
            htmlFor="niceToHave"
            label="Nilai tambah"
            bantuan="Satu baris satu poin."
            galat={g.niceToHave}
          >
            <Textarea
              id="niceToHave"
              name="niceToHave"
              rows={5}
              defaultValue={nilai('niceToHave', (lowongan?.niceToHave ?? []).join('\n'))}
              placeholder={'Pengalaman di industri FMCG\nBahasa Inggris aktif'}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-lg border border-[var(--color-garis)] bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-[var(--color-redup)]">
          Proses di sisi klien
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            htmlFor="decisionMaker"
            label="Siapa pengambil keputusan"
            galat={g.decisionMaker}
          >
            <Input
              id="decisionMaker"
              name="decisionMaker"
              defaultValue={nilai('decisionMaker', lowongan?.decisionMaker ?? '')}
              placeholder="Direktur Operasional"
            />
          </Field>

          <Field htmlFor="interviewer" label="Siapa yang mewawancara" galat={g.interviewer}>
            <Input
              id="interviewer"
              name="interviewer"
              defaultValue={nilai('interviewer', lowongan?.interviewer ?? '')}
            />
          </Field>

          <Field
            htmlFor="clientInterviewStages"
            label="Tahapan wawancara di sisi klien"
            bantuan="Satu baris satu tahap, berurutan. Dipakai untuk memberi tahu kandidat berapa kali ia akan dipanggil."
            galat={g.clientInterviewStages}
            className="sm:col-span-2"
          >
            <Textarea
              id="clientInterviewStages"
              name="clientInterviewStages"
              rows={3}
              defaultValue={nilai(
                'clientInterviewStages',
                (lowongan?.clientInterviewStages ?? []).join('\n'),
              )}
              placeholder={'Wawancara HR\nWawancara user\nWawancara direktur dan penawaran'}
            />
          </Field>

          <Field
            htmlFor="screeningQuestions"
            label="Pertanyaan penyaringan awal"
            bantuan="Satu baris satu pertanyaan. Mulai Fase 4, daftar ini bisa dibuatkan otomatis lalu Anda sunting."
            galat={g.screeningQuestions}
            className="sm:col-span-2"
          >
            <Textarea
              id="screeningQuestions"
              name="screeningQuestions"
              rows={4}
              defaultValue={nilai('screeningQuestions', (lowongan?.screeningQuestions ?? []).join('\n'))}
            />
          </Field>
        </div>
      </section>

      <div className="flex gap-2">
        <Button type="submit" disabled={sedangKirim}>
          {sedangKirim ? 'Menyimpan...' : lowongan ? 'Simpan perubahan' : 'Simpan lowongan'}
        </Button>
        <Link href={lowongan ? `/lowongan/${lowongan.id}` : '/lowongan'}>
          <Button type="button" variant="garis">
            Batal
          </Button>
        </Link>
      </div>
    </form>
  )
}
