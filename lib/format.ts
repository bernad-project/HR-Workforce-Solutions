/**
 * Pemformatan tampilan: rupiah dan waktu Asia/Jakarta.
 *
 * Semua nilai rupiah masuk ke sini sebagai `bigint` (rupiah penuh), bukan
 * `number`. Alasannya di CLAUDE.md "Uang": `number` JavaScript kehilangan
 * ketelitian di atas 9 kuadriliun dan — lebih berbahaya — membuat pembulatan
 * diam-diam terjadi di tempat yang tidak kita kehendaki. Fungsi di sini hanya
 * MENAMPILKAN; tidak ada satu pun yang menghitung ulang nilai uang.
 */

export const ZONA_WAKTU = 'Asia/Jakarta'

/** `6980667n` → `"Rp6.980.667"`. Nilai negatif → `"-Rp1.000"`. */
export function formatRupiah(nilai: bigint): string {
  const negatif = nilai < 0n
  const absolut = negatif ? -nilai : nilai
  const angka = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(absolut)
  return `${negatif ? '-' : ''}Rp${angka}`
}

/** `"0.1500"` → `"15%"`. Persentase disimpan sebagai pecahan NUMERIC(5,4). */
export function formatPersen(pecahan: string): string {
  const nilai = Number(pecahan) * 100
  const dibulatkan = Math.round(nilai * 100) / 100
  return `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(dibulatkan)}%`
}

/** Waktu tersimpan (TIMESTAMPTZ) → `"25 Agu 2026, 16.30"` waktu Jakarta. */
export function formatWaktu(waktu: Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: ZONA_WAKTU,
  }).format(waktu)
}

/** Waktu tersimpan (TIMESTAMPTZ) → `"25 Agustus 2026"` waktu Jakarta. */
export function formatTanggalDariWaktu(waktu: Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'long',
    timeZone: ZONA_WAKTU,
  }).format(waktu)
}

/**
 * Tanggal bisnis (kolom DATE) → `"25 Agustus 2026"`.
 *
 * Masukan berupa string `YYYY-MM-DD` apa adanya dari basis data. Sengaja TIDAK
 * lewat `new Date()`: tanggal bisnis tidak punya jam dan tidak punya zona
 * waktu, dan mengubahnya jadi objek Date adalah cara paling umum tanggal
 * bergeser sehari (CLAUDE.md "Waktu").
 */
const NAMA_BULAN = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const

export function formatTanggal(tanggal: string): string {
  const cocok = /^(\d{4})-(\d{2})-(\d{2})$/.exec(tanggal)
  if (!cocok) return tanggal
  const [, tahun, bulan, hari] = cocok
  const namaBulan = NAMA_BULAN[Number(bulan) - 1]
  if (!namaBulan) return tanggal
  return `${Number(hari)} ${namaBulan} ${tahun}`
}

/** Tanggal hari ini di Jakarta sebagai `YYYY-MM-DD`, untuk nilai awal form. */
export function tanggalHariIniJakarta(): string {
  const bagian = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_WAKTU,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
  return bagian
}
