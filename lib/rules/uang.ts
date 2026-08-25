/**
 * Aturan uang dan persentase. Fungsi murni — bisa diuji tanpa basis data.
 *
 * Tidak ada satu pun `number` di jalur yang menghasilkan nilai tersimpan
 * (CLAUDE.md "Uang"). Rupiah keluar sebagai `bigint`, persentase keluar sebagai
 * string desimal yang siap masuk kolom `NUMERIC(5,4)`.
 */

/**
 * Mengubah apa yang diketik orang menjadi rupiah penuh.
 *
 * Menerima `"8.333.333"`, `"8333333"`, `"Rp 8.333.333"`, dan `"8 333 333"`.
 * Menolak nilai berdesimal — rupiah di sistem ini tidak punya sen.
 *
 * Sengaja tidak lewat `parseInt`/`Number`: gaji tahunan dikali fee bisa
 * melewati batas aman `number`, dan kesalahannya tidak akan terlihat sampai
 * ada tagihan yang meleset satu rupiah.
 */
export function uraiRupiah(teks: string): bigint {
  const bersih = teks.trim()
  if (bersih === '') throw new Error('Nilai rupiah kosong')

  const negatif = bersih.startsWith('-')
  const tanpaTanda = negatif ? bersih.slice(1) : bersih

  // Buang "Rp", spasi, titik, dan koma pemisah ribuan.
  const angkaSaja = tanpaTanda.replace(/^rp/i, '').replace(/[.\s,]/g, '')

  if (!/^\d+$/.test(angkaSaja)) {
    throw new Error(`"${teks}" bukan nilai rupiah yang sah`)
  }

  const nilai = BigInt(angkaSaja)
  return negatif ? -nilai : nilai
}

/** Versi yang mengembalikan `null` alih-alih melempar galat, untuk isian opsional. */
export function uraiRupiahOpsional(teks: string | null | undefined): bigint | null {
  if (teks === null || teks === undefined || teks.trim() === '') return null
  return uraiRupiah(teks)
}

/**
 * `"15"` → `"0.1500"`, `"12,5"` → `"0.1250"`.
 *
 * Persentase disimpan sebagai pecahan `NUMERIC(5,4)`, jadi pembagian per seratus
 * dilakukan dengan menggeser koma pada teks — bukan dengan `/ 100`, yang pada
 * `12.5 / 100` menghasilkan `0.125` tapi pada nilai lain menghasilkan ekor
 * desimal yang tidak diinginkan.
 */
export function persenKePecahan(teks: string): string {
  const bersih = teks.trim().replace('%', '').replace(',', '.')
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(bersih)) {
    throw new Error(`"${teks}" bukan persentase yang sah`)
  }

  const [bulat = '0', desimal = ''] = bersih.split('.')
  // Persen dengan 2 angka di belakang koma = pecahan dengan 4 angka.
  const basisPoin = `${bulat}${desimal.padEnd(2, '0')}`.replace(/^0+(?=\d)/, '')
  const berbantalan = basisPoin.padStart(5, '0')
  const potong = berbantalan.length - 4
  return `${berbantalan.slice(0, potong)}.${berbantalan.slice(potong)}`
}

/** `"0.1500"` → `"15"`, untuk mengisi kembali kotak isian saat menyunting. */
export function pecahanKePersen(pecahan: string): string {
  const [bulat = '0', desimal = ''] = pecahan.trim().split('.')
  const gabung = `${bulat}${desimal.padEnd(4, '0').slice(0, 4)}`
  const bersih = gabung.replace(/^0+(?=\d)/, '')
  const berbantalan = bersih.padStart(3, '0')
  const potong = berbantalan.length - 2
  const hasil = `${berbantalan.slice(0, potong)}.${berbantalan.slice(potong)}`
  return hasil.replace(/\.?0+$/, '') || '0'
}
