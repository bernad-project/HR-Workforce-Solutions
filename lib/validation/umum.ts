import { z } from 'zod'
import { uraiRupiahOpsional } from '@/lib/rules/uang'

/**
 * Pembantu validasi yang dipakai berulang di beberapa entitas.
 *
 * Semuanya bekerja pada teks apa adanya dari `FormData`, karena isian HTML
 * selalu sampai ke server sebagai teks. Perubahan bentuk (teks → `bigint`,
 * teks → daftar) terjadi di sini, di batas server — bukan di komponen.
 */

/** Mengubah `FormData` menjadi objek teks biasa supaya bisa diperiksa Zod. */
export function bacaFormData(data: FormData): Record<string, string> {
  const hasil: Record<string, string> = {}
  for (const [kunci, nilai] of data.entries()) {
    if (typeof nilai === 'string') hasil[kunci] = nilai
  }
  return hasil
}

/** Isian teks yang boleh dikosongkan. Teks kosong disimpan sebagai NULL. */
export const teksOpsional = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .default(null)

export function teksWajib(pesan: string, maks = 500) {
  return z.string({ error: pesan }).trim().min(1, pesan).max(maks, `Maksimal ${maks} karakter`)
}

/** Isian rupiah opsional: `"8.333.333"` → `8333333n`. */
export const rupiahOpsional = z
  .string()
  .trim()
  .default('')
  .transform((v, ctx) => {
    try {
      return uraiRupiahOpsional(v)
    } catch {
      ctx.addIssue({ code: 'custom', message: 'Isi dengan angka saja, contoh: 8.500.000' })
      return null
    }
  })

/** Tanggal bisnis opsional. Tetap berupa teks `YYYY-MM-DD` — tidak pernah jadi `Date`. */
export const tanggalOpsional = z
  .string()
  .trim()
  .default('')
  .refine((v) => v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v), 'Tanggal tidak valid')
  .transform((v) => (v === '' ? null : v))

export function tanggalWajib(pesan: string) {
  return z
    .string({ error: pesan })
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, pesan)
}

/**
 * Isian daftar: satu baris satu nilai.
 *
 * Dipakai untuk `must_have`, `nice_to_have`, `skills`, dan
 * `screening_questions` — semuanya `TEXT[]` di basis data. Satu baris satu
 * nilai lebih mudah dibaca perekrut daripada dipisah koma, dan tidak bermasalah
 * bila isinya sendiri mengandung koma.
 */
export const daftarBaris = z
  .string()
  .default('')
  .transform((v) =>
    v
      .split('\n')
      .map((baris) => baris.trim())
      .filter((baris) => baris !== ''),
  )

/** Bilangan bulat opsional yang tidak boleh negatif. */
export function bilanganOpsional(pesan: string, maks?: number) {
  return z
    .string()
    .trim()
    .default('')
    .transform((v, ctx) => {
      if (v === '') return null
      if (!/^\d+$/.test(v)) {
        ctx.addIssue({ code: 'custom', message: pesan })
        return null
      }
      const angka = Number(v)
      if (maks !== undefined && angka > maks) {
        ctx.addIssue({ code: 'custom', message: `Maksimal ${maks}` })
        return null
      }
      return angka
    })
}

export const emailOpsional = z
  .string()
  .trim()
  .default('')
  .refine((v) => v === '' || z.string().email().safeParse(v).success, 'Format email tidak valid')
  .transform((v) => (v === '' ? null : v))

/** Bentuk keadaan yang dikembalikan setiap server action ke form. */
export type KeadaanForm = {
  pesan: string | null
  galat: Record<string, string>
  /**
   * Isi yang tadi diketik, dikembalikan apa adanya.
   *
   * React 19 mengosongkan isian form begitu server action selesai — termasuk
   * saat aksinya gagal. Tanpa ini, satu kesalahan kecil di form lowongan berarti
   * perekrut mengetik ulang seluruh isinya, dan itu cara tercepat membuat orang
   * berhenti memakai sistem. Nilai di sini dipasang kembali sebagai isi bawaan
   * setiap isian.
   */
  nilai: Record<string, string>
  /** Diisi bila aksi butuh persetujuan tambahan dari pengguna, misalnya kandidat serupa. */
  konfirmasi?: { pesan: string; serupa: { id: string; nama: string; keterangan: string }[] } | null
}

export const KEADAAN_AWAL: KeadaanForm = { pesan: null, galat: {}, nilai: {}, konfirmasi: null }

/**
 * Membaca kembali isi form untuk dikembalikan ke pengguna.
 * Isian berkas dan kata sandi sengaja tidak ikut.
 */
export function nilaiKembali(data: FormData): Record<string, string> {
  const hasil = bacaFormData(data)
  delete hasil.password
  return hasil
}

/** Mengubah galat Zod menjadi peta `nama field` → `pesan`, untuk ditampilkan di form. */
export function galatKeField(galat: z.ZodError): Record<string, string> {
  const hasil: Record<string, string> = {}
  for (const masalah of galat.issues) {
    const kunci = masalah.path.join('.')
    if (kunci && !hasil[kunci]) hasil[kunci] = masalah.message
  }
  return hasil
}
