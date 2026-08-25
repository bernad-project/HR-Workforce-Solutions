import { z } from 'zod'
import { normalisasiTelepon } from '@/lib/rules/duplikat'
import {
  bilanganOpsional,
  daftarBaris,
  emailOpsional,
  rupiahOpsional,
  teksOpsional,
  teksWajib,
} from './umum'

/** Nilai enum `candidate_source` di basis data. */
export const SUMBER_KANDIDAT = [
  { nilai: 'referral', label: 'Rekomendasi' },
  { nilai: 'job_portal', label: 'Portal lowongan' },
  { nilai: 'linkedin', label: 'LinkedIn' },
  { nilai: 'walk_in', label: 'Datang sendiri' },
  { nilai: 'database', label: 'Basis data internal' },
  { nilai: 'other', label: 'Lainnya' },
] as const

/** Nilai enum `candidate_status` di basis data. */
export const STATUS_KANDIDAT = [
  { nilai: 'active', label: 'Aktif' },
  { nilai: 'placed', label: 'Sudah ditempatkan' },
  { nilai: 'withdrawn', label: 'Mundur' },
  { nilai: 'blacklist', label: 'Daftar hitam' },
] as const

/**
 * Nomor telepon diseragamkan sebelum disimpan — `+62812…` dan `0812…` adalah
 * orang yang sama (SPEC §5.6). Tanpa ini, basis data hanya menolak yang
 * ketikannya kebetulan sama persis.
 */
const teleponOpsional = z
  .string()
  .trim()
  .default('')
  .transform((v, ctx) => {
    if (v === '') return null
    const rapi = normalisasiTelepon(v)
    if (!/^[0-9+]{8,20}$/.test(rapi)) {
      ctx.addIssue({ code: 'custom', message: 'Nomor tidak dikenali. Contoh: 0812-3456-7890' })
      return null
    }
    return rapi
  })

/** `NUMERIC(4,1)` — sampai 999,9 tahun. Disimpan sebagai teks agar tidak lewat float. */
const tahunPengalamanOpsional = z
  .string()
  .trim()
  .default('')
  .transform((v, ctx) => {
    if (v === '') return null
    const bersih = v.replace(',', '.')
    if (!/^\d{1,3}(\.\d)?$/.test(bersih)) {
      ctx.addIssue({ code: 'custom', message: 'Isi angka tahun, contoh: 5 atau 5,5' })
      return null
    }
    return bersih
  })

export const skemaKandidat = z.object({
  fullName: teksWajib('Nama lengkap wajib diisi'),
  phone: teleponOpsional,
  email: emailOpsional,
  domicileCity: teksOpsional,
  currentCompany: teksOpsional,
  currentTitle: teksOpsional,
  yearsExperience: tahunPengalamanOpsional,
  education: teksOpsional,
  skills: daftarBaris,
  currentSalary: rupiahOpsional,
  expectedSalary: rupiahOpsional,
  noticePeriodDays: bilanganOpsional('Isi jumlah hari', 365),
  source: z
    .enum(['referral', 'job_portal', 'linkedin', 'walk_in', 'database', 'other'])
    .default('other'),
  sourceDetail: teksOpsional,
  status: z.enum(['active', 'placed', 'withdrawn', 'blacklist']).default('active'),
  notes: teksOpsional,
})

export type DataKandidat = z.infer<typeof skemaKandidat>

/**
 * Persetujuan pemrosesan data — SPEC §9.1, wajib UU 27/2022.
 *
 * Dikumpulkan bersamaan dengan pembuatan kandidat, bukan ditunda ke Fase 7.
 * Yang ditunda ke Fase 7 hanyalah layar pengelolaannya.
 *
 * `evidence` dijadikan wajib walau kolomnya boleh kosong di basis data, karena
 * SPEC §9.1 menyebut bukti sebagai bagian dari isi minimal. Catatan persetujuan
 * tanpa bukti tidak banyak menolong bila suatu saat ditanya.
 */
export const skemaPersetujuan = z.object({
  method: z.enum(['form_daring', 'whatsapp', 'email', 'kertas'], {
    error: 'Pilih lewat saluran apa persetujuan diperoleh',
  }),
  evidence: teksWajib(
    'Tulis bukti persetujuannya — misalnya kalimat balasan kandidat di WhatsApp, ' +
      'atau keterangan di mana tangkapan layarnya disimpan',
    2000,
  ),
  konfirmasi: z
    .string()
    .optional()
    .refine((v) => v === 'ya', 'Centang dulu bahwa kandidat sudah diberi tahu dan setuju'),
})

export const skemaKandidatBaru = z.object({
  ...skemaKandidat.shape,
  persetujuanMethod: skemaPersetujuan.shape.method,
  persetujuanEvidence: skemaPersetujuan.shape.evidence,
  persetujuanKonfirmasi: skemaPersetujuan.shape.konfirmasi,
  /** Diisi pengguna saat memilih tetap membuat kandidat baru walau ada yang mirip. */
  abaikanSerupa: z.string().optional(),
})

export type DataKandidatBaru = z.infer<typeof skemaKandidatBaru>

/** Penyaring daftar kandidat. */
export const skemaFilterKandidat = z.object({
  cari: z.string().trim().default(''),
  keahlian: z.string().trim().default(''),
  status: z.string().trim().default(''),
  kota: z.string().trim().default(''),
})
