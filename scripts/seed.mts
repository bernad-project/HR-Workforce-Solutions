/**
 * Menyiapkan isi awal basis data: satu akun pemilik dan identitas perusahaan.
 *
 *   npm run db:seed
 *
 * Aman diulang. Bila akun pemilik dengan email yang sama sudah ada, skrip ini
 * tidak membuat akun kedua dan tidak menimpa kata sandi yang berlaku.
 */
import './env.mts'
import { urlBasisData } from '../lib/db/url'
import { bacaPengaturanPerusahaan, semaiPemilik } from './lib-persiapan.mts'

async function utama(): Promise<void> {
  const url = urlBasisData()
  if (!url) {
    console.error('Alamat basis data belum ada. Isi DATABASE_URL di .env.local.')
    process.exit(1)
  }

  const email = process.env.OWNER_EMAIL?.trim()
  const kataSandi = process.env.OWNER_PASSWORD

  if (!email || !kataSandi) {
    console.error(
      'OWNER_EMAIL dan OWNER_PASSWORD belum diisi di .env.local.\n' +
        'Keduanya dipakai untuk membuat akun pemilik pertama.',
    )
    process.exit(1)
  }

  const hasil = await semaiPemilik(url, {
    email,
    kataSandi,
    nama: process.env.OWNER_NAME?.trim() || 'Pemilik',
    namaPerusahaan: process.env.COMPANY_LEGAL_NAME?.trim() || undefined,
  })

  console.log(
    hasil.dibuat ? `Akun pemilik dibuat: ${hasil.email}` : `Akun ${hasil.email} sudah ada — tidak diubah.`,
  )

  const pengaturan = await bacaPengaturanPerusahaan(url)
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
}

utama().catch((galat: unknown) => {
  console.error('Penyemaian gagal:', galat instanceof Error ? galat.message : galat)
  process.exit(1)
})
