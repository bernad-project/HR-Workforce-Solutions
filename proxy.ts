import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth.config'

/**
 * Pemeriksaan "sudah masuk atau belum" yang berjalan sebelum setiap halaman.
 *
 * Di Next.js 16 berkas ini bernama `proxy.ts` (dulu `middleware.ts`). Ia memakai
 * konfigurasi tanpa basis data — lihat catatan di `lib/auth.config.ts`.
 */
const { auth } = NextAuth(authConfig)

export default auth

export const config = {
  // Semua rute kecuali berkas statis, gambar, dan rute autentikasi itu sendiri.
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
