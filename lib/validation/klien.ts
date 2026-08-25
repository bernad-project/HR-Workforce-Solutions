import { z } from 'zod'
import { persenKePecahan } from '@/lib/rules/uang'
import {
  bilanganOpsional,
  emailOpsional,
  tanggalOpsional,
  teksOpsional,
  teksWajib,
} from './umum'

/** Nilai enum `client_status` di basis data. */
export const STATUS_KLIEN = [
  { nilai: 'prospect', label: 'Prospek' },
  { nilai: 'active', label: 'Aktif' },
  { nilai: 'dormant', label: 'Tidak aktif' },
  { nilai: 'blacklist', label: 'Daftar hitam' },
] as const

export const skemaKlien = z.object({
  name: teksWajib('Nama perusahaan wajib diisi'),
  industry: teksOpsional,
  address: teksOpsional,
  npwp: teksOpsional,
  picName: teksOpsional,
  picTitle: teksOpsional,
  picPhone: teksOpsional,
  picEmail: emailOpsional,
  status: z.enum(['prospect', 'active', 'dormant', 'blacklist']).default('prospect'),
  notes: teksOpsional,
})

export type DataKlien = z.infer<typeof skemaKlien>

/**
 * Perjanjian jasa rekrutmen — ketentuan komersialnya hidup di sini, bukan di
 * `clients` (SPEC §4).
 *
 * Persentase diketik dalam persen (`15`) dan disimpan sebagai pecahan
 * (`0.1500`). Perubahan bentuknya lewat `persenKePecahan`, bukan `/ 100`.
 *
 * Basis data menolak `fee_percent` di luar 10%–30% lewat `chk_fee_range`. Batas
 * yang sama ditegakkan di sini supaya pesan galatnya bisa dibaca orang, bukan
 * berupa pesan constraint Postgres. Lihat docs/CATATAN-TEMUAN.md nomor 2 soal
 * kalimat "kecuali owner menimpa" di SPEC §5.1 yang belum ada wujudnya.
 */
export const skemaPerjanjian = z
  .object({
    agreementNumber: teksOpsional,
    signedDate: tanggalOpsional,
    startDate: tanggalOpsional,
    endDate: tanggalOpsional,
    feePercent: z
      .string({ error: 'Persentase fee wajib diisi' })
      .trim()
      .min(1, 'Persentase fee wajib diisi')
      .transform((v, ctx) => {
        let pecahan: string
        try {
          pecahan = persenKePecahan(v)
        } catch {
          ctx.addIssue({ code: 'custom', message: 'Isi angka persen saja, contoh: 15 atau 12,5' })
          return z.NEVER
        }
        const angka = Number(pecahan)
        if (angka < 0.1 || angka > 0.3) {
          ctx.addIssue({
            code: 'custom',
            message: 'Fee harus antara 10% dan 30%. Basis data menolak di luar rentang itu.',
          })
          return z.NEVER
        }
        return pecahan
      }),
    splitFirstPercent: z
      .string()
      .trim()
      .default('50')
      .transform((v, ctx) => {
        const teks = v === '' ? '50' : v
        try {
          const pecahan = persenKePecahan(teks)
          const angka = Number(pecahan)
          if (angka < 0 || angka > 1) {
            ctx.addIssue({ code: 'custom', message: 'Porsi tagihan pertama harus 0%–100%' })
            return z.NEVER
          }
          return pecahan
        } catch {
          ctx.addIssue({ code: 'custom', message: 'Isi angka persen saja, contoh: 50' })
          return z.NEVER
        }
      }),
    guaranteeDays: bilanganOpsional('Isi jumlah hari', 365),
    paymentTermsDays: bilanganOpsional('Isi jumlah hari', 180),
    protectionMonths: bilanganOpsional('Isi jumlah bulan', 60),
    notes: teksOpsional,
  })
  .refine(
    (d) => !d.startDate || !d.endDate || d.endDate >= d.startDate,
    { message: 'Tanggal berakhir tidak boleh sebelum tanggal mulai', path: ['endDate'] },
  )

export type DataPerjanjian = z.infer<typeof skemaPerjanjian>
