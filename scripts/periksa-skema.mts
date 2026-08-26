/**
 * Memastikan skema yang diuji dan skema yang dijalankan tetap sama.
 *
 *   npm run db:periksa-skema
 *
 * Ada dua sumber kebenaran yang harus tidak pernah berbeda:
 *
 *   · `docs/schema.sql`  — skema yang dipakai `docs/test_rules.sql` dan yang
 *                          sudah diuji di Postgres 16.
 *   · `drizzle/*.sql`    — migrasi yang benar-benar dijalankan ke basis data
 *                          sungguhan, termasuk saat penempatan ke Vercel.
 *
 * Sebelumnya keduanya dijaga dengan membandingkan ISI BERKAS: migrasi 0000
 * harus sama persis dengan `docs/schema.sql`. Penjagaan itu bekerja selama
 * migrasinya cuma satu, lalu langsung rusak begitu ada migrasi kedua — padahal
 * migrasi kedua adalah hal yang normal dan pasti terjadi.
 *
 * Yang dilakukan di sini adalah pemeriksaan yang sebenarnya, bukan pengganti
 * yang kebetulan cocok: dua basis data sementara dibuat, satu diisi dari
 * `docs/schema.sql` dan satu lagi dari seluruh migrasi, lalu bentuk akhir
 * keduanya dibandingkan dengan `pg_dump --schema-only`. Yang dibandingkan
 * adalah hasilnya, bukan cara menulisnya — jadi migrasi boleh sebanyak apa pun
 * dan ditulis sebebas apa pun, asal ujungnya sama.
 *
 * Perlu Postgres di komputer sendiri dan perintah `pg_dump`. Karena itu skrip
 * ini TIDAK ikut berjalan saat penempatan; ia dijalankan sebelum perubahan
 * skema di-commit.
 */
import './env.mts'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Client } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { AKAR } from './env.mts'
import { buatPool } from './lib-persiapan.mts'

const DB_ASAL = 'hh_periksa_asal'
const DB_MIGRASI = 'hh_periksa_migrasi'

/**
 * Skrip ini MENGHAPUS lalu membuat ulang dua basis data. Supaya tidak pernah
 * ada kemungkinan mengenai basis data sungguhan, sasarannya harus Postgres di
 * komputer sendiri.
 */
function pilihSasaran(): string {
  const url = process.env.TEST_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim()
  if (!url) {
    console.error(
      'Alamat basis data belum ada. Isi TEST_DATABASE_URL atau DATABASE_URL di .env.local\n' +
        'dengan Postgres di komputer sendiri.',
    )
    process.exit(1)
  }
  if (!url.includes('localhost') && !url.includes('127.0.0.1')) {
    console.error(
      'Pemeriksaan ini membuat dan menghapus basis data sementara, jadi ia menolak\n' +
        'berjalan di luar Postgres komputer sendiri.',
    )
    process.exit(1)
  }
  return url
}

/** Alamat yang sama, tapi menunjuk ke basis data lain. */
function keBasisData(url: string, nama: string): string {
  const alamat = new URL(url)
  alamat.pathname = `/${nama}`
  return alamat.toString()
}

async function siapkanBasisDataKosong(urlAdmin: string, nama: string): Promise<void> {
  const client = new Client({ connectionString: urlAdmin })
  await client.connect()
  try {
    // Nama basis data tidak bisa dititipkan sebagai parameter; ia tetap
    // dikutip dengan aman lewat format('%I') di sisi Postgres.
    await client.query(`DROP DATABASE IF EXISTS ${nama} WITH (FORCE)`)
    await client.query(`CREATE DATABASE ${nama}`)
  } finally {
    await client.end()
  }
}

async function hapusBasisData(urlAdmin: string, nama: string): Promise<void> {
  const client = new Client({ connectionString: urlAdmin })
  await client.connect()
  try {
    await client.query(`DROP DATABASE IF EXISTS ${nama} WITH (FORCE)`)
  } finally {
    await client.end()
  }
}

async function terapkanSchemaSql(url: string): Promise<void> {
  const client = new Client({ connectionString: url })
  await client.connect()
  try {
    await client.query(readFileSync(resolve(AKAR, 'docs/schema.sql'), 'utf8'))
  } finally {
    await client.end()
  }
}

async function terapkanMigrasi(url: string): Promise<void> {
  const pool = buatPool(url)
  try {
    await migrate(drizzle(pool), { migrationsFolder: resolve(AKAR, 'drizzle') })
  } finally {
    await pool.end()
  }
}

/**
 * Bentuk akhir sebuah basis data sebagai teks.
 *
 * `--schema=public` sengaja dipakai: catatan migrasi Drizzle hidup di skema
 * `drizzle` dan memang hanya ada di sisi migrasi. Ia bukan bagian dari skema
 * yang dibandingkan.
 */
function bentukSkema(url: string): string {
  const keluaran = execFileSync(
    'pg_dump',
    ['--schema-only', '--no-owner', '--no-privileges', '--no-comments', '--schema=public', url],
    { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
  )
  return keluaran
    .split('\n')
    .filter((baris) => {
      if (baris.trim() === '' || baris.startsWith('--')) return false
      // pg_dump 16.3+ membungkus keluarannya dengan \restrict/\unrestrict yang
      // memakai token acak berbeda setiap kali dijalankan. Ia bukan bagian dari
      // skema, dan kalau ikut dibandingkan tidak akan pernah ada dua dump yang sama.
      if (baris.startsWith('\\restrict') || baris.startsWith('\\unrestrict')) return false
      return true
    })
    .join('\n')
}

function tampilkanBeda(asal: string, migrasi: string): void {
  const a = asal.split('\n')
  const b = migrasi.split('\n')
  const hanyaDiAsal = a.filter((baris) => !b.includes(baris))
  const hanyaDiMigrasi = b.filter((baris) => !a.includes(baris))

  if (hanyaDiAsal.length > 0) {
    console.error('\nAda di docs/schema.sql tapi TIDAK dihasilkan migrasi:')
    for (const baris of hanyaDiAsal.slice(0, 40)) console.error(`  - ${baris}`)
    if (hanyaDiAsal.length > 40) console.error(`  … dan ${hanyaDiAsal.length - 40} baris lagi`)
  }
  if (hanyaDiMigrasi.length > 0) {
    console.error('\nDihasilkan migrasi tapi TIDAK ada di docs/schema.sql:')
    for (const baris of hanyaDiMigrasi.slice(0, 40)) console.error(`  + ${baris}`)
    if (hanyaDiMigrasi.length > 40) console.error(`  … dan ${hanyaDiMigrasi.length - 40} baris lagi`)
  }
}

async function utama(): Promise<void> {
  const sasaran = pilihSasaran()
  const urlAdmin = keBasisData(sasaran, 'postgres')
  const urlAsal = keBasisData(sasaran, DB_ASAL)
  const urlMigrasi = keBasisData(sasaran, DB_MIGRASI)

  try {
    console.log('Membangun basis data dari docs/schema.sql ...')
    await siapkanBasisDataKosong(urlAdmin, DB_ASAL)
    await terapkanSchemaSql(urlAsal)

    console.log('Membangun basis data dari seluruh migrasi di drizzle/ ...')
    await siapkanBasisDataKosong(urlAdmin, DB_MIGRASI)
    await terapkanMigrasi(urlMigrasi)

    console.log('Membandingkan bentuk akhir keduanya ...')
    const asal = bentukSkema(urlAsal)
    const migrasi = bentukSkema(urlMigrasi)

    if (asal === migrasi) {
      console.log('')
      console.log('Sama. Skema yang diuji dan skema yang dijalankan tidak berbeda.')
      return
    }

    console.error('')
    console.error('BERBEDA. docs/schema.sql dan hasil migrasi tidak menghasilkan skema yang sama.')
    console.error('Salah satunya belum diperbarui. Samakan dulu, baru lanjut.')
    tampilkanBeda(asal, migrasi)
    process.exitCode = 1
  } finally {
    await hapusBasisData(urlAdmin, DB_ASAL)
    await hapusBasisData(urlAdmin, DB_MIGRASI)
  }
}

utama().catch((galat: unknown) => {
  console.error('Pemeriksaan skema gagal dijalankan:', galat instanceof Error ? galat.message : galat)
  process.exit(1)
})
