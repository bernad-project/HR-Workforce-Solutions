/**
 * Menjalankan migrasi basis data.
 *
 * Migrasi 0000 adalah salinan persis `docs/schema.sql` — skema yang sudah diuji
 * di Postgres 16. Perintah ini aman diulang: migrasi yang sudah pernah jalan
 * tidak dijalankan dua kali.
 *
 *   npm run db:migrate
 */
import { AKAR } from './env.mts'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'


function periksaSalinanSkema(): void {
  const asli = readFileSync(resolve(AKAR, 'docs/schema.sql'), 'utf8')
  const migrasi = readFileSync(resolve(AKAR, 'drizzle/0000_init.sql'), 'utf8')
  if (asli !== migrasi) {
    throw new Error(
      'drizzle/0000_init.sql tidak lagi sama dengan docs/schema.sql.\n' +
        'Skema yang diuji dan skema yang dijalankan harus identik. Samakan dulu, ' +
        'baru migrasi.',
    )
  }
}

async function utama(): Promise<void> {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('DATABASE_URL belum diisi. Salin .env.example menjadi .env.local lalu isi.')
    process.exit(1)
  }

  periksaSalinanSkema()

  const lokal = url.includes('localhost') || url.includes('127.0.0.1')
  const pool = new Pool({
    connectionString: url,
    ssl: lokal ? undefined : { rejectUnauthorized: true },
    max: 1,
  })
  const db = drizzle(pool)

  console.log('Menjalankan migrasi...')
  await migrate(db, { migrationsFolder: resolve(AKAR, 'drizzle') })
  console.log('Migrasi selesai. Basis data siap dipakai.')

  await pool.end()
}

utama().catch((galat: unknown) => {
  console.error('Migrasi gagal:', galat instanceof Error ? galat.message : galat)
  process.exit(1)
})
