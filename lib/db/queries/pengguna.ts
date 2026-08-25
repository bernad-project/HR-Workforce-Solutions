import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'

/**
 * Apakah sudah ada akun staf sama sekali.
 *
 * Dipakai di halaman masuk. Bila tabelnya sudah jadi tapi belum ada satu akun
 * pun, pemilik akan melihat kotak isian yang tidak mungkin diisi dengan benar —
 * dan tidak ada petunjuk kenapa. Pemeriksaan ini yang membuat halaman masuk
 * bisa menjelaskan keadaannya.
 *
 * Bila basis datanya tidak bisa dihubungi, jawabannya `true`: lebih baik
 * menampilkan form masuk seperti biasa daripada menuduh pemilik belum punya
 * akun padahal sebenarnya hanya gangguan sambungan.
 */
export async function adaAkunStaf(): Promise<boolean> {
  try {
    const [baris] = await db
      .select({ ada: sql<boolean>`count(*) > 0` })
      .from(users)
      .limit(1)
    return baris?.ada ?? true
  } catch {
    return true
  }
}
