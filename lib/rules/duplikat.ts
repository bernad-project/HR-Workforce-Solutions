/**
 * Pencegahan kandidat kembar — SPEC §5.6. Fungsi murni.
 *
 * Kenapa nomor telepon dinormalkan sebelum disimpan: basis data menolak nomor
 * yang sama persis, tapi `081200000001` dan `+6281200000001` adalah dua teks
 * berbeda. Tanpa penyeragaman, orang yang sama masuk dua kali, lalu diajukan ke
 * klien yang sama lewat dua baris berbeda — dan klaim proteksi 12 bulan (§5.5)
 * jadi menunjuk ke dua tanggal.
 */

/**
 * Menyeragamkan nomor Indonesia ke bentuk `08…`.
 *
 *   `+62 812-3456-7890` → `081234567890`
 *   `62 812 3456 7890`  → `081234567890`
 *   `812-3456-7890`     → `081234567890`
 *
 * Nomor yang jelas bukan nomor Indonesia dikembalikan apa adanya setelah
 * dibersihkan dari spasi dan tanda hubung — lebih baik disimpan utuh daripada
 * dipaksa masuk pola yang salah.
 */
export function normalisasiTelepon(nomor: string): string {
  const bersih = nomor.replace(/[\s\-().]/g, '')
  if (bersih === '') return ''

  if (bersih.startsWith('+62')) return `0${bersih.slice(3)}`
  if (bersih.startsWith('62') && !bersih.startsWith('620')) return `0${bersih.slice(2)}`
  if (bersih.startsWith('0')) return bersih
  // Nomor seluler Indonesia tanpa awalan apa pun selalu mulai dengan 8.
  if (/^8\d{7,13}$/.test(bersih)) return `0${bersih}`

  return bersih
}

/** Email disimpan apa adanya, tapi dibandingkan dalam huruf kecil. */
export function normalisasiEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * Nomor WhatsApp untuk tautan `wa.me`, yang menuntut bentuk `62…` tanpa tanda
 * plus. Dipakai mulai Fase 6, ditaruh di sini supaya penyeragamannya cuma ada
 * di satu tempat.
 */
export function teleponKeWa(nomor: string): string {
  const lokal = normalisasiTelepon(nomor)
  return lokal.startsWith('0') ? `62${lokal.slice(1)}` : lokal
}
