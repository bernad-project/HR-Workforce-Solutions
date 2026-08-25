/**
 * Isi sebenarnya dari perintah migrasi dan penyemaian.
 *
 * Ditaruh terpisah supaya tiga pemanggilnya memakai kode yang sama persis:
 * `npm run db:migrate`, `npm run db:seed`, dan langkah persiapan yang berjalan
 * otomatis saat penempatan ke Vercel. Kalau ketiganya punya salinan sendiri,
 * cepat atau lambat salah satunya akan menyimpang.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'
import * as schema from '../lib/db/schema'
import { companySettings, users } from '../lib/db/schema'
import { skemaKataSandiBaru } from '../lib/validation/auth'
import { AKAR } from './env.mts'

function lokal(url: string): boolean {
  return url.includes('localhost') || url.includes('127.0.0.1')
}

export function buatPool(url: string): Pool {
  return new Pool({
    connectionString: url,
    ssl: lokal(url) ? undefined : { rejectUnauthorized: true },
    max: 1,
  })
}

/**
 * Menjaga agar skema yang diuji dan skema yang dijalankan tidak pernah berbeda.
 * Migrasi 0000 adalah salinan persis `docs/schema.sql`.
 */
export function periksaSalinanSkema(): void {
  const asli = readFileSync(resolve(AKAR, 'docs/schema.sql'), 'utf8')
  const migrasi = readFileSync(resolve(AKAR, 'drizzle/0000_init.sql'), 'utf8')
  if (asli !== migrasi) {
    throw new Error(
      'drizzle/0000_init.sql tidak lagi sama dengan docs/schema.sql.\n' +
        'Skema yang diuji dan skema yang dijalankan harus identik. Samakan dulu, baru migrasi.',
    )
  }
}

export async function jalankanMigrasi(url: string): Promise<void> {
  periksaSalinanSkema()
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
