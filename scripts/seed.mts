/**
 * Menyiapkan isi awal basis data: satu akun pemilik dan identitas perusahaan.
 *
 *   npm run db:seed
 *
 * Aman diulang. Bila akun pemilik dengan email yang sama sudah ada, skrip ini
 * tidak membuat akun kedua dan tidak menimpa kata sandi yang berlaku.
 */
import './env.mts'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'
import * as schema from '../lib/db/schema'
import { companySettings, users } from '../lib/db/schema'
import { skemaKataSandiBaru } from '../lib/validation/auth'

async function utama(): Promise<void> {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('DATABASE_URL belum diisi.')
    process.exit(1)
  }

  const email = process.env.OWNER_EMAIL?.trim().toLowerCase()
  const kataSandi = process.env.OWNER_PASSWORD
  const nama = process.env.OWNER_NAME?.trim() || 'Pemilik'
  const namaPerusahaan = process.env.COMPANY_LEGAL_NAME?.trim()

  if (!email || !kataSandi) {
    console.error(
      'OWNER_EMAIL dan OWNER_PASSWORD belum diisi di .env.local.\n' +
        'Keduanya dipakai untuk membuat akun pemilik pertama.',
    )
    process.exit(1)
  }

  const cekSandi = skemaKataSandiBaru.safeParse(kataSandi)
  if (!cekSandi.success) {
    console.error(`OWNER_PASSWORD ditolak: ${cekSandi.error.issues[0]?.message}`)
    process.exit(1)
  }

  const lokal = url.includes('localhost') || url.includes('127.0.0.1')
  const pool = new Pool({
    connectionString: url,
    ssl: lokal ? undefined : { rejectUnauthorized: true },
    max: 1,
  })
  const db = drizzle(pool, { schema, casing: 'snake_case' })

  const [sudahAda] = await db.select().from(users).where(eq(users.email, email)).limit(1)

  if (sudahAda) {
    console.log(`Akun ${email} sudah ada — tidak diubah.`)
  } else {
    const hash = await bcrypt.hash(kataSandi, 12)
    await db.insert(users).values({
      email,
      passwordHash: hash,
      fullName: nama,
      role: 'owner',
    })
    console.log(`Akun pemilik dibuat: ${email}`)
  }

  if (namaPerusahaan) {
    await db
      .update(companySettings)
      .set({ legalName: namaPerusahaan, updatedAt: new Date() })
      .where(eq(companySettings.id, 1))
    console.log(`Nama perusahaan disetel: ${namaPerusahaan}`)
  }

  const [pengaturan] = await db.select().from(companySettings).where(eq(companySettings.id, 1)).limit(1)
  if (pengaturan) {
    console.log('')
    console.log('Pengaturan perusahaan saat ini:')
    console.log(`  Nama              : ${pengaturan.legalName}`)
    console.log(`  Sudah PKP         : ${pengaturan.isPkp ? 'ya' : 'belum'}  (PPN 11% hanya muncul bila ya)`)
    console.log(`  Fee bawaan        : ${(Number(pengaturan.defaultFeePercent) * 100).toFixed(2)}%`)
    console.log(`  Garansi bawaan    : ${pengaturan.defaultGuaranteeDays} hari`)
    console.log(`  Tempo bayar       : ${pengaturan.defaultPaymentTermsDays} hari`)
    console.log(`  Proteksi kandidat : ${pengaturan.defaultProtectionMonths} bulan`)
    console.log(`  Retensi data      : ${pengaturan.defaultRetentionMonths} bulan`)
  }

  await pool.end()
}

utama().catch((galat: unknown) => {
  console.error('Penyemaian gagal:', galat instanceof Error ? galat.message : galat)
  process.exit(1)
})
