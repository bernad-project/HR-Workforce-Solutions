import { z } from 'zod'

/**
 * Validasi dijalankan di server, bukan hanya di form (CLAUDE.md "Konvensi kode").
 * Pesan kesalahan berbahasa Indonesia karena langsung tampil ke pengguna.
 */
export const skemaMasuk = z.object({
  email: z
    .string({ error: 'Email wajib diisi' })
    .trim()
    .min(1, 'Email wajib diisi')
    .email('Format email tidak valid'),
  password: z
    .string({ error: 'Kata sandi wajib diisi' })
    .min(1, 'Kata sandi wajib diisi'),
})

export type DataMasuk = z.infer<typeof skemaMasuk>

/** Aturan kata sandi untuk pembuatan akun staf. */
export const skemaKataSandiBaru = z
  .string()
  .min(12, 'Kata sandi minimal 12 karakter')
  .max(200, 'Kata sandi terlalu panjang')
