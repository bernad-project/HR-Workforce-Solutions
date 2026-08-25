/**
 * Langkah persiapan yang berjalan otomatis setiap kali sistem ditempatkan ke
 * Vercel — sebelum aplikasinya dibangun.
 *
 * Kenapa otomatis, padahal biasanya migrasi basis data sebaiknya dijalankan
 * manual: pemilik sistem ini bukan programmer dan tidak punya terminal. Kalau
 * pembuatan tabel menuntut satu perintah baris perintah, sistemnya tidak akan
 * pernah benar-benar jalan. Yang dijalankan di sini adalah migrasi berbasis
 * berkas yang sudah di-commit dan sudah diuji — bukan `db push`, yang memang
 * dilarang (CLAUDE.md "Basis data dan hosting").
 *
 * Aman diulang, dan sengaja TIDAK menggagalkan pembangunan bila basis datanya
 * belum tersambung: dalam keadaan itu aplikasi tetap ditempatkan dan menampilkan
 * halaman `/persiapan` yang menjelaskan apa yang masih kurang.
 */
import './env.mts'
import { urlBasisData } from '../lib/db/url'
import { bacaPengaturanPerusahaan, jalankanMigrasi, semaiPemilik } from './lib-persiapan.mts'

function garis(pesan: string): void {
  console.log(`[persiapan] ${pesan}`)
}

async function utama(): Promise<void> {
  const url = urlBasisData()

  if (!url) {
    garis('Alamat basis data belum ada — migrasi dilewati.')
    garis('Aplikasi tetap ditempatkan dan akan menampilkan halaman persiapan.')
    return
  }

  garis('Menjalankan migrasi basis data...')
  await jalankanMigrasi(url)
  garis('Migrasi selesai.')

  const email = process.env.OWNER_EMAIL?.trim()
  const kataSandi = process.env.OWNER_PASSWORD

  if (!email || !kataSandi) {
    garis('OWNER_EMAIL / OWNER_PASSWORD belum diisi — akun pemilik belum dibuat.')
    return
  }

  /**
   * Kegagalan di sini sengaja TIDAK menjatuhkan penempatan.
   *
   * Tabelnya sudah terbuat — yang gagal hanya pembuatan akun, dan penyebabnya
   * hampir selalu nilai pengaturan yang keliru, misalnya kata sandi kurang dari
   * 12 karakter. Menjatuhkan seluruh penempatan karena satu salah ketik berarti
   * seluruh sistem ikut mati, padahal yang perlu diperbaiki cuma satu kotak
   * isian. Halaman masuk yang akan memberi tahu pemilik apa yang kurang.
   */
  try {
    const hasil = await semaiPemilik(url, {
      email,
      kataSandi,
      nama: process.env.OWNER_NAME?.trim() || 'Pemilik',
      namaPerusahaan: process.env.COMPANY_LEGAL_NAME?.trim() || undefined,
    })
    garis(hasil.dibuat ? `Akun pemilik dibuat: ${hasil.email}` : `Akun ${hasil.email} sudah ada.`)

    const pengaturan = await bacaPengaturanPerusahaan(url)
    if (pengaturan) garis(`Perusahaan: ${pengaturan.legalName}`)
  } catch (galat) {
    const pesan = galat instanceof Error ? galat.message : String(galat)
    garis(`Akun pemilik BELUM dibuat: ${pesan}`)
    garis('Perbaiki nilainya di Environment Variables, lalu jalankan penempatan ulang.')
    garis('Penempatan diteruskan — tabelnya sudah siap.')
  }
}

utama().catch((galat: unknown) => {
  const pesan = galat instanceof Error ? galat.message : String(galat)
  console.error(`[persiapan] GAGAL: ${pesan}`)
  // Sampai di sini artinya MIGRASI yang gagal, bukan pembuatan akun.
  // Migrasi yang gagal berarti basis data tidak dalam keadaan yang diharapkan.
  // Menempatkan aplikasi di atas basis data seperti itu lebih berbahaya daripada
  // penempatan yang gagal terang-terangan, jadi pembangunan dihentikan.
  process.exit(1)
})
