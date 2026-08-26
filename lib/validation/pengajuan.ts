import { z } from 'zod'
import { teksOpsional, teksWajib } from './umum'

/**
 * Isian pipeline — SPEC §6.1.
 *
 * Pemeriksaan urutan tahap TIDAK ada di sini; ia hidup di `lib/rules/tahapan.ts`
 * sebagai fungsi murni yang bisa diuji tanpa basis data (CLAUDE.md "Konvensi
 * kode"). Yang diperiksa berkas ini hanya bentuk isiannya.
 */

export const TAHAP_PENGAJUAN = [
  'sourced',
  'screened',
  'interviewed_internal',
  'submitted_to_client',
  'client_interview',
  'offer',
  'signed',
  'started',
  'guarantee_passed',
  'rejected',
  'withdrawn',
] as const

/** Siapa yang menolak — SPEC §6.1. Bedanya penting untuk metrik penyaringan. */
export const PENOLAK = [
  { nilai: 'us', label: 'Kami sendiri' },
  { nilai: 'client', label: 'Klien' },
] as const

export const skemaPengajuanBaru = z.object({
  jobId: z.string({ error: 'Lowongan wajib dipilih' }).uuid('Lowongan wajib dipilih'),
  candidateId: z.string({ error: 'Kandidat wajib dipilih' }).uuid('Kandidat wajib dipilih'),
  notes: teksOpsional,
})

export type DataPengajuanBaru = z.infer<typeof skemaPengajuanBaru>

export const skemaPindahTahap = z
  .object({
    submissionId: z.string().uuid('Pengajuan tidak dikenali'),
    ke: z.enum(TAHAP_PENGAJUAN, { error: 'Tahap tujuan tidak dikenali' }),
    catatan: teksOpsional,
    /** CV versi mana yang dikirim — hanya relevan saat diajukan ke klien. */
    documentId: z
      .string()
      .trim()
      .default('')
      .transform((v) => (v === '' ? null : v))
      .refine((v) => v === null || z.string().uuid().safeParse(v).success, 'Dokumen tidak dikenali'),
    rejectedBy: z
      .string()
      .trim()
      .default('')
      .transform((v) => (v === '' ? null : v))
      .refine((v) => v === null || v === 'us' || v === 'client', 'Pilih siapa yang menolak'),
    rejectionReason: teksOpsional,
  })
  /**
   * Basis data juga menjaganya lewat `chk_rejection_reason`. Yang diperiksa di
   * sini bukan pengulangan sia-sia: tanpa ini, perekrut melihat pesan constraint
   * Postgres alih-alih kalimat yang menyebutkan apa yang kurang.
   *
   * Kenapa alasan penolakan diwajibkan sama sekali: tanpa alasan, tidak ada cara
   * menjawab pertanyaan "kenapa 8 dari 10 kandidat kita ditolak klien ini" —
   * dan itu satu-satunya pertanyaan yang bisa memperbaiki mutu penyaringan.
   */
  .refine((d) => d.ke !== 'rejected' || d.rejectedBy !== null, {
    message: 'Sebutkan siapa yang menolak.',
    path: ['rejectedBy'],
  })
  .refine((d) => d.ke !== 'rejected' || (d.rejectionReason?.trim().length ?? 0) > 0, {
    message: 'Tuliskan alasan penolakan.',
    path: ['rejectionReason'],
  })

export type DataPindahTahap = z.infer<typeof skemaPindahTahap>

/** Penyaring papan pipeline. */
export const skemaFilterPipeline = z.object({
  cari: z.string().trim().default(''),
  lowongan: z.string().trim().default(''),
  klien: z.string().trim().default(''),
})

export const skemaCatatanWajib = teksWajib('Tuliskan alasannya', 1000)
