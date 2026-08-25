/**
 * Menambah akun staf (owner atau recruiter).
 *
 *   npm run user:tambah -- --email=budi@perusahaan.co.id --nama="Budi" --peran=recruiter
 *
 * Kata sandi ditanyakan lewat variabel lingkungan `KATA_SANDI` supaya tidak
 * tersimpan di riwayat perintah:
 *
 *   KATA_SANDI='...' npm run user:tambah -- --email=... --nama=... --peran=recruiter
 *
 * Skrip ini dipakai saat merekrut orang pertama. Akun `client_viewer` TIDAK
 * dibuat di sini — PIC klien masuk lewat magic link (SPEC §3), dibangun di Fase 5.
 */
import './env.mts'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'
import * as schema from '../lib/db/schema'
import { users } from '../lib/db/schema'
import { skemaKataSandiBaru } from '../lib/validation/auth'

function bacaArgumen(nama: string): string | undefined {
  const awalan = `--${nama}=`
  const cocok = process.argv.find((a) => a.startsWith(awalan))
  return cocok?.slice(awalan.length).trim()
}

async function utama(): Promise<void> {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('DATABASE_URL belum diisi.')
    process.exit(1)
  }

  const email = bacaArgumen('email')?.toLowerCase()
  const nama = bacaArgumen('nama')
  const peran = bacaArgumen('peran') ?? 'recruiter'
  const kataSandi = process.env.KATA_SANDI

  if (!email || !nama || !kataSandi) {
    console.error(
      'Cara pakai:\n' +
        "  KATA_SANDI='...' npm run user:tambah -- --email=budi@perusahaan.co.id --nama=\"Budi\" --peran=recruiter\n\n" +
        'Peran yang tersedia: owner, recruiter',
    )
    process.exit(1)
  }

  if (peran !== 'owner' && peran !== 'recruiter') {
    console.error(`Peran "${peran}" tidak dikenal. Pilih: owner atau recruiter.`)
    process.exit(1)
  }

  const cekSandi = skemaKataSandiBaru.safeParse(kataSandi)
  if (!cekSandi.success) {
    console.error(`Kata sandi ditolak: ${cekSandi.error.issues[0]?.message}`)
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
    console.error(`Akun ${email} sudah ada. Tidak ada yang diubah.`)
    await pool.end()
    process.exit(1)
  }

  await db.insert(users).values({
    email,
    passwordHash: await bcrypt.hash(kataSandi, 12),
    fullName: nama,
    role: peran,
  })

  console.log(`Akun dibuat: ${email} (${peran === 'owner' ? 'pemilik' : 'perekrut'})`)
  if (peran === 'recruiter') {
    console.log('Perekrut tidak bisa melihat nilai fee, tagihan, maupun laporan pendapatan.')
  }

  await pool.end()
}

utama().catch((galat: unknown) => {
  console.error('Gagal menambah pengguna:', galat instanceof Error ? galat.message : galat)
  process.exit(1)
})
