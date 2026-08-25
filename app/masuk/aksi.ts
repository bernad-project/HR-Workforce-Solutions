'use server'

import { AuthError } from 'next-auth'
import { signIn } from '@/lib/auth'
import { skemaMasuk } from '@/lib/validation/auth'

/**
 * `email` dikembalikan supaya bisa diisikan lagi ke form. React 19 mengosongkan
 * isian form begitu aksi selesai, dan tanpa ini pengguna harus mengetik ulang
 * emailnya setiap kali kata sandinya keliru. Kata sandi sengaja TIDAK
 * dikembalikan.
 */
export type KeadaanMasuk = { pesan: string | null; email: string }

export async function aksiMasuk(_sebelumnya: KeadaanMasuk, data: FormData): Promise<KeadaanMasuk> {
  const emailDiketik = typeof data.get('email') === 'string' ? String(data.get('email')) : ''

  const hasil = skemaMasuk.safeParse({
    email: data.get('email'),
    password: data.get('password'),
  })

  if (!hasil.success) {
    return { pesan: hasil.error.issues[0]?.message ?? 'Data tidak valid', email: emailDiketik }
  }

  try {
    await signIn('credentials', {
      email: hasil.data.email,
      password: hasil.data.password,
      redirectTo: '/dasbor',
    })
  } catch (galat) {
    // Pengalihan setelah berhasil masuk dilempar sebagai galat oleh Next.js —
    // ia harus diteruskan, bukan ditangkap.
    if (galat instanceof AuthError) {
      // Sengaja tidak membedakan "email tidak terdaftar" dan "kata sandi salah".
      // Membedakannya akan memberi tahu orang luar email mana yang punya akun.
      return { pesan: 'Email atau kata sandi salah.', email: emailDiketik }
    }
    throw galat
  }

  return { pesan: null, email: emailDiketik }
}
