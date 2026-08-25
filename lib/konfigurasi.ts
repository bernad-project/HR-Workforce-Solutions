/**
 * Memeriksa apakah pengaturan yang wajib sudah terisi.
 *
 * Tanpa `DATABASE_URL` dan `AUTH_SECRET`, aplikasi ini tidak bisa berbuat apa-apa
 * dan setiap halaman akan gagal dengan pesan yang tidak berguna bagi siapa pun.
 * Daripada begitu, seluruh permintaan dialihkan ke halaman `/persiapan` yang
 * menyebutkan persis apa yang belum diisi dan di mana mengisinya.
 *
 * Berkas ini tidak boleh mengimpor basis data atau Auth.js — ia dipakai di
 * `proxy.ts`, yang berjalan sebelum keduanya siap.
 */

export type PengaturanWajib = {
  nama: string
  judul: string
  keterangan: string
  caraMengisi: string
}

export const PENGATURAN_WAJIB: PengaturanWajib[] = [
  {
    nama: 'DATABASE_URL',
    judul: 'Basis data',
    keterangan: 'Tempat seluruh data klien, lowongan, dan kandidat disimpan.',
    caraMengisi:
      'Di proyek Vercel Anda, buka tab Storage, pilih Neon Postgres dari Marketplace, ' +
      'lalu sambungkan ke proyek ini. Vercel mengisi nilainya sendiri.',
  },
  {
    nama: 'AUTH_SECRET',
    judul: 'Kunci pengaman sesi',
    keterangan:
      'Dipakai menandatangani cookie sesi, supaya orang lain tidak bisa memalsukan status "sudah masuk".',
    caraMengisi:
      'Di Vercel, buka Settings → Environment Variables, tambahkan AUTH_SECRET dengan nilai ' +
      'acak apa saja sepanjang minimal 32 karakter.',
  },
]

export const PENGATURAN_TAMBAHAN: PengaturanWajib[] = [
  {
    nama: 'OWNER_EMAIL',
    judul: 'Email akun pemilik',
    keterangan: 'Akun pertama yang bisa masuk ke sistem. Dibuat otomatis saat penempatan berikutnya.',
    caraMengisi: 'Tambahkan di Settings → Environment Variables.',
  },
  {
    nama: 'OWNER_PASSWORD',
    judul: 'Kata sandi akun pemilik',
    keterangan: 'Minimal 12 karakter. Bisa diganti nanti.',
    caraMengisi: 'Tambahkan di Settings → Environment Variables.',
  },
]

function kosong(nama: string): boolean {
  const nilai = process.env[nama]
  return nilai === undefined || nilai.trim() === ''
}

/** Daftar pengaturan wajib yang belum diisi. Kosong berarti aplikasi siap jalan. */
export function pengaturanYangKurang(): PengaturanWajib[] {
  return PENGATURAN_WAJIB.filter((p) => kosong(p.nama))
}

/** Daftar pengaturan tambahan yang belum diisi. Tidak menghalangi aplikasi jalan. */
export function pengaturanTambahanYangKurang(): PengaturanWajib[] {
  return PENGATURAN_TAMBAHAN.filter((p) => kosong(p.nama))
}

export function siapDipakai(): boolean {
  return pengaturanYangKurang().length === 0
}
