/**
 * Aturan tanggal. Fungsi murni — bisa diuji tanpa basis data.
 *
 * Semua tanggal bisnis diperlakukan sebagai teks `YYYY-MM-DD`. Tidak ada objek
 * `Date` di sini dengan sengaja: begitu tanggal masuk ke `Date`, ia membawa jam
 * dan zona waktu, dan `2026-12-01` di Jakarta bisa terbaca `2026-11-30` di
 * tempat lain (CLAUDE.md "Waktu").
 */

const POLA_TANGGAL = /^(\d{4})-(\d{2})-(\d{2})$/

export function uraiTanggal(tanggal: string): { tahun: number; bulan: number; hari: number } {
  const cocok = POLA_TANGGAL.exec(tanggal.trim())
  if (!cocok) throw new Error(`"${tanggal}" bukan tanggal YYYY-MM-DD`)
  const [, t, b, h] = cocok
  return { tahun: Number(t), bulan: Number(b), hari: Number(h) }
}

/** Jumlah hari dalam satu bulan, sudah memperhitungkan tahun kabisat. */
export function hariDalamBulan(tahun: number, bulan: number): number {
  return [31, adalahKabisat(tahun) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][bulan - 1] ?? 30
}

export function adalahKabisat(tahun: number): boolean {
  return (tahun % 4 === 0 && tahun % 100 !== 0) || tahun % 400 === 0
}

function susun(tahun: number, bulan: number, hari: number): string {
  return `${String(tahun).padStart(4, '0')}-${String(bulan).padStart(2, '0')}-${String(hari).padStart(2, '0')}`
}

/**
 * Menambah bulan pada sebuah tanggal.
 *
 * Bila tanggal asal tidak ada di bulan tujuan, dipotong ke hari terakhir bulan
 * itu: 31 Januari + 1 bulan = 28 Februari (atau 29 di tahun kabisat). Ini
 * perilaku yang sama dengan `INTERVAL '1 month'` di Postgres, supaya hasil di
 * kode dan hasil di basis data tidak pernah berbeda.
 */
export function tambahBulan(tanggal: string, bulan: number): string {
  const { tahun: t, bulan: b, hari: h } = uraiTanggal(tanggal)

  const totalBulan = (t * 12 + (b - 1)) + bulan
  const tahunBaru = Math.floor(totalBulan / 12)
  const bulanBaru = (totalBulan % 12) + 1

  const batas = hariDalamBulan(tahunBaru, bulanBaru)
  return susun(tahunBaru, bulanBaru, Math.min(h, batas))
}

/** Menambah hari pada sebuah tanggal. */
export function tambahHari(tanggal: string, hari: number): string {
  let { tahun, bulan, hari: h } = uraiTanggal(tanggal)
  h += hari

  while (h > hariDalamBulan(tahun, bulan)) {
    h -= hariDalamBulan(tahun, bulan)
    bulan++
    if (bulan > 12) {
      bulan = 1
      tahun++
    }
  }
  while (h < 1) {
    bulan--
    if (bulan < 1) {
      bulan = 12
      tahun--
    }
    h += hariDalamBulan(tahun, bulan)
  }

  return susun(tahun, bulan, h)
}

/**
 * Batas penyimpanan data kandidat — SPEC §9.3.
 *
 * Dihitung dari aktivitas terakhir, bukan dari tanggal kandidat dibuat. Selama
 * kandidat masih diproses, batasnya ikut bergeser; begitu ia diam, hitungan 24
 * bulan berjalan.
 */
export function hitungRetentionUntil(tanggalAktivitasTerakhir: string, bulanRetensi: number): string {
  return tambahBulan(tanggalAktivitasTerakhir, bulanRetensi)
}

/**
 * Nomor hari berurutan sejak 1 Maret tahun 0 — dipakai hanya untuk menghitung
 * SELISIH antara dua tanggal, tidak pernah ditampilkan.
 *
 * Alasan memakai ini alih-alih `new Date(a) - new Date(b)`: pengurangan dua
 * objek `Date` bekerja dalam milidetik dan ikut membawa jam serta zona waktu,
 * jadi jawabannya bisa meleset satu hari tergantung di mana kodenya berjalan.
 * Perhitungan di bawah murni bilangan bulat dan selalu memberi jawaban yang sama.
 *
 * Algoritmanya "days from civil" — sama seperti yang dipakai Postgres untuk
 * pengurangan tipe DATE.
 */
export function nomorHari(tanggal: string): number {
  const { tahun, bulan, hari } = uraiTanggal(tanggal)
  const t = bulan <= 2 ? tahun - 1 : tahun
  const era = Math.floor(t / 400)
  const tahunDalamEra = t - era * 400
  const hariDalamTahun = Math.floor((153 * (bulan + (bulan > 2 ? -3 : 9)) + 2) / 5) + hari - 1
  const hariDalamEra =
    tahunDalamEra * 365 +
    Math.floor(tahunDalamEra / 4) -
    Math.floor(tahunDalamEra / 100) +
    hariDalamTahun
  return era * 146097 + hariDalamEra - 719468
}

/** Berapa hari dari `dari` sampai `ke`. Negatif bila `ke` lebih awal. */
export function selisihHari(dari: string, ke: string): number {
  return nomorHari(ke) - nomorHari(dari)
}
