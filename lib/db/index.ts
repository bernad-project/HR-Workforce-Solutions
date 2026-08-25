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
 */
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

function bacaUrlBasisData(): string {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error(
      'DATABASE_URL belum diisi. Salin .env.example menjadi .env.local lalu isi ' +
        'connection string Neon (yang mengandung "-pooler").',
    )
  }
  return url
}

function butuhSsl(url: string): boolean {
  try {
    const host = new URL(url).hostname
    return host !== 'localhost' && host !== '127.0.0.1'
  } catch {
    return true
  }
}

function buatPool(): Pool {
  const url = bacaUrlBasisData()
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
const global_ = globalThis as unknown as { __hhPool?: Pool }
const pool = global_.__hhPool ?? buatPool()
if (process.env.NODE_ENV !== 'production') global_.__hhPool = pool

export const db = drizzle(pool, { schema, casing: 'snake_case' })
export { pool }
export * as tabel from './schema'
