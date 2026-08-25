import type { NextAuthConfig } from 'next-auth'
import 'next-auth/jwt'
import type { PeranPengguna } from '@/lib/db/schema'

/**
 * Bagian konfigurasi masuk yang aman dijalankan di middleware.
 *
 * Middleware Next.js berjalan di lingkungan terbatas yang tidak bisa membuka
 * koneksi ke basis data. Karena itu konfigurasi dipecah dua: berkas ini berisi
 * aturan "siapa boleh masuk halaman mana" (tidak menyentuh basis data), dan
 * `lib/auth.ts` berisi pemeriksaan email + kata sandi yang memang perlu basis
 * data.
 */

/** Sesi 30 hari — SPEC §3. */
export const UMUR_SESI_DETIK = 30 * 24 * 60 * 60

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: PeranPengguna
    }
  }
  interface User {
    role: PeranPengguna
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: PeranPengguna
  }
}

export const authConfig = {
  trustHost: true,
  session: { strategy: 'jwt', maxAge: UMUR_SESI_DETIK },
  pages: {
    signIn: '/masuk',
    error: '/masuk',
  },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string
        token.role = user.role
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id
      session.user.role = token.role
      return session
    },
    /**
     * Halaman internal hanya untuk staf yang sudah masuk. Portal klien (`/portal`)
     * memakai jalur terpisah dengan magic link — dibangun di Fase 5, jadi belum
     * disebut di sini.
     */
    authorized({ auth, request }) {
      const sudahMasuk = Boolean(auth?.user)
      const jalur = request.nextUrl.pathname

      const jalurPublik = jalur === '/masuk'
      if (jalurPublik) {
        if (sudahMasuk) {
          return Response.redirect(new URL('/dasbor', request.nextUrl))
        }
        return true
      }

      return sudahMasuk
    },
  },
} satisfies NextAuthConfig
