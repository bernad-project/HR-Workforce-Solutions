import { NextResponse, type NextFetchEvent, type NextRequest } from 'next/server'
import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth.config'
import { siapDipakai } from '@/lib/konfigurasi'

/**
 * Pemeriksaan yang berjalan sebelum setiap halaman.
 *
 * Dua lapis, berurutan:
 *
 * 1. **Pengaturan sudah lengkap?** Bila `DATABASE_URL` atau `AUTH_SECRET` masih
 *    kosong, seluruh permintaan diarahkan ke halaman `/persiapan`. Tanpa ini,
 *    sistem yang baru ditempatkan akan menampilkan galat yang tidak berguna bagi
 *    pemiliknya. Pemeriksaan ini harus lebih dulu, karena Auth.js sendiri butuh
 *    `AUTH_SECRET` untuk bekerja.
 * 2. **Sudah masuk?** Aturannya ada di `lib/auth.config.ts`, yang sengaja tidak
 *    menyentuh basis data karena berkas ini berjalan di lingkungan terbatas.
 *
 * Di Next.js 16 berkas ini bernama `proxy.ts` (dulu `middleware.ts`).
 */
const { auth } = NextAuth(authConfig)

type Middleware = (
  permintaan: NextRequest,
  konteks: NextFetchEvent,
) => Response | undefined | Promise<Response | undefined>

/**
 * `auth` punya beberapa bentuk pemanggilan, dan yang dipakai di sini adalah
 * bentuk middleware. Tipe bawaannya tidak menyebutkan bentuk itu, jadi
 * dialiaskan sekali di sini — bukan disebar sebagai `any` ke mana-mana.
 *
 * Ia tidak boleh dipanggil sebelum pemeriksaan pengaturan di bawah, karena
 * Auth.js butuh `AUTH_SECRET` untuk bekerja sama sekali.
 */
const periksaSesi = auth as unknown as Middleware

export default function proxy(permintaan: NextRequest, konteks: NextFetchEvent) {
  const jalur = permintaan.nextUrl.pathname

  if (!siapDipakai()) {
    if (jalur === '/persiapan') return NextResponse.next()
    return NextResponse.rewrite(new URL('/persiapan', permintaan.nextUrl))
  }

  // Halaman persiapan tidak berguna lagi setelah pengaturannya lengkap.
  if (jalur === '/persiapan') {
    return NextResponse.redirect(new URL('/dasbor', permintaan.nextUrl))
  }

  return periksaSesi(permintaan, konteks)
}

export const config = {
  // Semua rute kecuali berkas statis, gambar, dan rute autentikasi itu sendiri.
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
