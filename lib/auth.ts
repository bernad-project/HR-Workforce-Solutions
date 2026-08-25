import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { authConfig } from '@/lib/auth.config'
import { skemaMasuk } from '@/lib/validation/auth'

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Kata sandi', type: 'password' },
      },
      async authorize(kredensial) {
        const hasil = skemaMasuk.safeParse(kredensial)
        if (!hasil.success) return null

        const { email, password } = hasil.data

        const [pengguna] = await db
          .select()
          .from(users)
          .where(eq(users.email, email.toLowerCase()))
          .limit(1)

        // Tetap jalankan perbandingan hash walau pengguna tidak ada, supaya
        // lama tanggapan tidak membocorkan email mana yang terdaftar.
        const hash = pengguna?.passwordHash ?? '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin'
        const cocok = await bcrypt.compare(password, hash)

        if (!pengguna || !cocok) return null
        if (!pengguna.isActive) return null

        await db
          .update(users)
          .set({ lastLoginAt: new Date() })
          .where(eq(users.id, pengguna.id))

        return {
          id: pengguna.id,
          email: pengguna.email,
          name: pengguna.fullName,
          role: pengguna.role,
        }
      },
    }),
  ],
})

/**
 * Sesi yang dijamin ada. Dipakai di Server Component dan server action supaya
 * tidak ada halaman yang lupa memeriksa.
 */
export async function sesiWajib() {
  const sesi = await auth()
  if (!sesi?.user) throw new Error('Belum masuk')
  return sesi
}

/**
 * Pagar peran `owner`.
 *
 * Yang dijaga: nilai fee, tagihan, dan laporan pendapatan tidak pernah terlihat
 * oleh peran `recruiter` (CLAUDE.md poin 8, SPEC §5.7). Setiap halaman uang
 * memanggil ini lebih dulu.
 */
export async function sesiOwnerWajib() {
  const sesi = await sesiWajib()
  if (sesi.user.role !== 'owner') throw new Error('Hanya pemilik yang boleh membuka halaman ini')
  return sesi
}
