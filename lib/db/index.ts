/**
 * Satu sambungan basis data untuk seluruh aplikasi.
 *
 * Kenapa driver Postgres biasa (`pg`) dan bukan paket khusus Neon:
 * Neon bicara dengan protokol Postgres standar, jadi satu driver ini bekerja
 * sama persis di Neon maupun di Postgres lokal saat pengembangan. Artinya tidak
 * ada dua jalur kode yang bisa berbeda perilaku — yang diuji di laptop adalah
 * yang jalan di produksi.
 *
 * Catatan: `@vercel/postgres` sengaja TIDAK dipakai. Vercel Postgres dihentikan
 * Juni 2025 dan dimigrasikan ke Neon (CLAUDE.md "Basis data dan hosting").
 *
 * Sambungannya dibuat saat pertama kali dipakai, bukan saat berkas ini dimuat.
 * Bedanya penting: pada penempatan pertama ke Vercel, basis datanya belum
 * tersambung. Kalau sambungan dibuat saat modul dimuat, seluruh pembangunan
 * gagal dan pemilik hanya melihat penempatan yang merah. Dengan cara ini,
 * aplikasi tetap terpasang dan menampilkan halaman `/persiapan` yang
 * menjelaskan apa yang masih kurang.
 */
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'
import { butuhSsl, urlBasisDataWajib } from './url'

type BasisData = ReturnType<typeof drizzle<typeof schema>>

function buatPool(): Pool {
  const url = urlBasisDataWajib()
  return new Pool({
    connectionString: url,
    ssl: butuhSsl(url) ? { rejectUnauthorized: true } : undefined,
    // Serverless membuka banyak instance kecil. Batas rendah per instance
    // mencegah kehabisan kuota koneksi di Neon.
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  })
}

// Next.js memuat ulang modul saat pengembangan. Tanpa cache ini, tiap perubahan
// berkas akan meninggalkan pool koneksi yang menggantung.
const global_ = globalThis as unknown as { __hhDb?: BasisData }

function basisData(): BasisData {
  if (!global_.__hhDb) {
    global_.__hhDb = drizzle(buatPool(), { schema, casing: 'snake_case' })
  }
  return global_.__hhDb
}

/**
 * Dipakai persis seperti objek Drizzle biasa (`db.select()`, `db.insert()`,
 * `db.transaction()`). Pembungkus ini hanya menunda pembuatan sambungan sampai
 * ada yang benar-benar memanggilnya.
 */
export const db = new Proxy({} as BasisData, {
  get(_sasaran, nama, penerima) {
    const asli = basisData()
    const nilai = Reflect.get(asli as object, nama, penerima)
    return typeof nilai === 'function' ? nilai.bind(asli) : nilai
  },
}) as BasisData

export * as tabel from './schema'
