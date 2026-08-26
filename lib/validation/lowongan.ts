import { z } from 'zod'
import {
  bilanganOpsional,
  daftarBaris,
  rupiahOpsional,
  tanggalOpsional,
  teksOpsional,
  teksWajib,
} from './umum'

/** Nilai enum `job_status` di basis data. */
export const STATUS_LOWONGAN = [
  { nilai: 'draft', label: 'Draf' },
  { nilai: 'open', label: 'Terbuka' },
  { nilai: 'on_hold', label: 'Ditunda' },
  { nilai: 'filled', label: 'Terisi' },
  { nilai: 'cancelled', label: 'Dibatalkan' },
  { nilai: 'lost', label: 'Batal / pindah vendor' },
] as const

export const JENIS_HUBUNGAN_KERJA = ['Karyawan tetap', 'PKWT / kontrak', 'Harian lepas', 'Magang'] as const

/** Pola kerja. Ditulis dalam kata yang dipakai klien, bukan singkatan saja. */
export const POLA_KERJA = [
  'Penuh di kantor (WFO)',
  'Penuh dari rumah (WFH)',
  'Campuran (hybrid)',
  'Kerja di lapangan',
] as const

export const skemaLowongan = z
  .object({
    clientId: z.string({ error: 'Klien wajib dipilih' }).uuid('Klien wajib dipilih'),
    agreementId: z
      .string()
      .trim()
      .default('')
      .transform((v) => (v === '' ? null : v))
      .refine((v) => v === null || z.string().uuid().safeParse(v).success, 'Perjanjian tidak valid'),
    title: teksWajib('Nama jabatan wajib diisi'),
    headcount: z
      .string()
      .trim()
      .default('1')
      .transform((v, ctx) => {
        const teks = v === '' ? '1' : v
        if (!/^\d+$/.test(teks) || Number(teks) < 1) {
          ctx.addIssue({ code: 'custom', message: 'Jumlah kebutuhan minimal 1' })
          return z.NEVER
        }
        return Number(teks)
      }),
    location: teksOpsional,
    employmentType: teksOpsional,
    salaryMin: rupiahOpsional,
    salaryMax: rupiahOpsional,
    mustHave: daftarBaris,
    niceToHave: daftarBaris,
    reasonPreviousFailed: teksOpsional,
    decisionMaker: teksOpsional,
    interviewer: teksOpsional,
    vacancyAgeNote: teksOpsional,
    targetStartDate: tanggalOpsional,
    screeningQuestions: daftarBaris,
    status: z.enum(['draft', 'open', 'on_hold', 'filled', 'cancelled', 'lost']).default('draft'),
    // Enam isian formulir kebutuhan klien yang ditambahkan 26 Agustus 2026.
    mainDuties: daftarBaris,
    department: teksOpsional,
    reportsTo: teksOpsional,
    workArrangement: teksOpsional,
    benefits: daftarBaris,
    clientInterviewStages: daftarBaris,
  })
  .refine((d) => d.salaryMin === null || d.salaryMax === null || d.salaryMax >= d.salaryMin, {
    message: 'Gaji maksimal tidak boleh lebih kecil dari gaji minimal',
    path: ['salaryMax'],
  })
  /**
   * SPEC §6.3: `reason_previous_failed` wajib saat lowongan berpindah ke `open`.
   *
   * Basis data juga menjaganya lewat `chk_reason_required_when_open`. Yang
   * diperiksa di sini bukan pengulangan sia-sia — ini yang membuat perekrut
   * membaca kalimat "Apa yang membuat kandidat sebelumnya tidak cocok?"
   * alih-alih pesan constraint Postgres.
   */
  .refine((d) => d.status !== 'open' || (d.reasonPreviousFailed?.trim().length ?? 0) > 0, {
    message:
      'Wajib diisi sebelum lowongan dibuka. Jawaban ini sering berbeda dari deskripsi ' +
      'jabatan tertulis, dan justru itu yang memberi tahu apa yang benar-benar dicari klien.',
    path: ['reasonPreviousFailed'],
  })

export type DataLowongan = z.infer<typeof skemaLowongan>

/** Penyaring daftar lowongan. */
export const skemaFilterLowongan = z.object({
  cari: z.string().trim().default(''),
  status: z.string().trim().default(''),
  klien: z.string().trim().default(''),
})
