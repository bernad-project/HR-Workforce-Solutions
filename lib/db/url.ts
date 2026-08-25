/**
 * Mencari alamat sambungan basis data.
 *
 * Kenapa tidak cukup membaca `DATABASE_URL` saja: saat Neon dipasang lewat
 * Marketplace Vercel, ia mengisi beberapa variabel sekaligus dan namanya pernah
 * berbeda-beda antar versi integrasi. Kalau sistem ini hanya mengenal satu nama,
 * pemilik bisa sudah memasang basis datanya dengan benar tapi tetap melihat
 * halaman persiapan — tanpa petunjuk apa pun soal apa yang salah.
 *
 * Urutan di bawah mendahulukan alamat ber-pooler, karena aplikasi ini berjalan
 * di serverless dan membuka sambungan berkali-kali.
 *
 * Berkas ini sengaja tidak mengimpor apa pun: ia dipakai juga oleh `proxy.ts`,
 * yang berjalan sebelum basis data dan Auth.js siap.
 */

export const NAMA_VARIABEL_BASIS_DATA = [
  'DATABASE_URL',
  'POSTGRES_URL',
  'DATABASE_URL_UNPOOLED',
  'POSTGRES_URL_NON_POOLING',
] as const

export function urlBasisData(): string | null {
  for (const nama of NAMA_VARIABEL_BASIS_DATA) {
    const nilai = process.env[nama]
    if (nilai && nilai.trim() !== '') return nilai.trim()
  }
  return null
}

export function urlBasisDataWajib(): string {
  const url = urlBasisData()
  if (!url) {
    throw new Error(
      'Alamat basis data belum ada. Di Vercel: buka tab Storage, pasang Neon Postgres, ' +
        'lalu sambungkan ke proyek ini — Vercel mengisi DATABASE_URL sendiri. ' +
        'Untuk pengembangan di komputer sendiri: salin .env.example menjadi .env.local lalu isi.',
    )
  }
  return url
}

export function butuhSsl(url: string): boolean {
  try {
    const host = new URL(url).hostname
    return host !== 'localhost' && host !== '127.0.0.1'
  } catch {
    return true
  }
}
