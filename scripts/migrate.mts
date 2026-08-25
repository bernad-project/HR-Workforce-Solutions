/**
 * Menjalankan migrasi basis data.
 *
 *   npm run db:migrate
 *
 * Aman diulang: migrasi yang sudah pernah jalan tidak dijalankan dua kali.
 * Isi sebenarnya ada di `lib-persiapan.mts`, dipakai bersama oleh perintah ini
 * dan oleh langkah persiapan otomatis saat penempatan.
 */
import './env.mts'
import { urlBasisData } from '../lib/db/url'
import { jalankanMigrasi } from './lib-persiapan.mts'

async function utama(): Promise<void> {
  const url = urlBasisData()
  if (!url) {
    console.error('Alamat basis data belum ada. Salin .env.example menjadi .env.local lalu isi DATABASE_URL.')
    process.exit(1)
  }

  console.log('Menjalankan migrasi...')
  await jalankanMigrasi(url)
  console.log('Migrasi selesai. Basis data siap dipakai.')
}

utama().catch((galat: unknown) => {
  console.error('Migrasi gagal:', galat instanceof Error ? galat.message : galat)
  process.exit(1)
})
