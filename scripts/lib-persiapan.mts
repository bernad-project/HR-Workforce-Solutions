/**
 * Isi sebenarnya dari perintah migrasi dan penyemaian.
 *
 * Ditaruh terpisah supaya tiga pemanggilnya memakai kode yang sama persis:
 * `npm run db:migrate`, `npm run db:seed`, dan langkah persiapan yang berjalan
 * otomatis saat penempatan ke Vercel. Kalau ketiganya punya salinan sendiri,
 * cepat atau lambat salah satunya akan menyimpang.
 */
import { resolve } from 'node:path'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'
import * as schema from '../lib/db/schema'
import { companySettings, users } from '../lib/db/schema'
import { skemaKataSandiBaru } from '../lib/validation/auth'
import { butuhSsl } from '../lib/db/url'
import { AKAR } from './env.mts'

export function buatPool(url: string): Pool {
  return new Pool({
    connectionString: url,
    ssl: butuhSsl(url) ? { rejectUnauthorized: true } : undefined,
    max: 1,
  })
}

/**
 * Menjalankan migrasi berbasis berkas.
 *
 * Tidak ada pemeriksaan kesetaraan skema di sini dengan sengaja. Sebelumnya
 * fungsi ini menolak jalan bila `drizzle/0000_init.sql` tidak sama persis
 * dengan `docs/schema.sql` — penjagaan yang hanya benar selama migrasinya cuma
 * satu, dan langsung menghalangi migrasi kedua yang sah.
 *
 * Kesetaraan tetap dijaga, tapi di tempat yang tepat: `npm run db:periksa-skema`
 * membangun dua basis data sementara — satu dari `docs/schema.sql`, satu dari
 * seluruh migrasi — lalu membandingkan bentuk akhirnya. Pemeriksaan itu perlu
 * Postgres di komputer sendiri, jadi ia dijalankan sebelum commit, bukan saat
 * penempatan.
 */
export async function jalankanMigrasi(url: string): Promise<void> {
  const pool = buatPool(url)
  try {
    await migrate(drizzle(pool), { migrationsFolder: resolve(AKAR, 'drizzle') })
  } finally {
    await pool.end()
  }
}

export type HasilSemai = { dibuat: boolean; email: string }

/**
 * Membuat akun pemilik pertama. Aman diulang: bila akun dengan email yang sama
 * sudah ada, kata sandinya TIDAK ditimpa.
 */
export async function semaiPemilik(
  url: string,
  masukan: { email: string; kataSandi: string; nama: string; namaPerusahaan?: string },
): Promise<HasilSemai> {
  const cekSandi = skemaKataSandiBaru.safeParse(masukan.kataSandi)
  if (!cekSandi.success) {
    throw new Error(`Kata sandi pemilik ditolak: ${cekSandi.error.issues[0]?.message}`)
  }

  const email = masukan.email.trim().toLowerCase()
  const pool = buatPool(url)
  const db = drizzle(pool, { schema, casing: 'snake_case' })

  try {
    const [sudahAda] = await db.select().from(users).where(eq(users.email, email)).limit(1)

    if (!sudahAda) {
      await db.insert(users).values({
        email,
        passwordHash: await bcrypt.hash(masukan.kataSandi, 12),
        fullName: masukan.nama,
        role: 'owner',
      })
    }

    if (masukan.namaPerusahaan) {
      await db
        .update(companySettings)
        .set({ legalName: masukan.namaPerusahaan, updatedAt: new Date() })
        .where(eq(companySettings.id, 1))
    }

    return { dibuat: !sudahAda, email }
  } finally {
    await pool.end()
  }
}

export async function bacaPengaturanPerusahaan(url: string) {
  const pool = buatPool(url)
  const db = drizzle(pool, { schema, casing: 'snake_case' })
  try {
    const [pengaturan] = await db
      .select()
      .from(companySettings)
      .where(eq(companySettings.id, 1))
      .limit(1)
    return pengaturan ?? null
  } finally {
    await pool.end()
  }
}
