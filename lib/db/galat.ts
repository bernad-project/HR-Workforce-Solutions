/**
 * Menerjemahkan galat Postgres menjadi kalimat yang berguna bagi pengguna.
 *
 * Penjaga di basis data adalah penjaga yang sebenarnya — ia bekerja walau ada
 * jalur kode yang lupa memeriksa. Tapi pesannya ditulis untuk programmer.
 * Berkas ini yang mengubahnya jadi kalimat yang bisa ditindaklanjuti perekrut.
 */

type GalatPostgres = { code?: string; constraint?: string; message?: string }

function bacaGalat(galat: unknown): GalatPostgres | null {
  if (typeof galat !== 'object' || galat === null) return null
  const g = galat as GalatPostgres
  return typeof g.code === 'string' ? g : null
}

const PESAN_CONSTRAINT: Record<string, string> = {
  uq_candidates_phone:
    'Nomor telepon ini sudah dipakai kandidat lain. Cari dulu kandidatnya di daftar, ' +
    'lalu perbarui datanya alih-alih membuat kandidat baru.',
  uq_candidates_email:
    'Email ini sudah dipakai kandidat lain. Cari dulu kandidatnya di daftar, ' +
    'lalu perbarui datanya alih-alih membuat kandidat baru.',
  uq_submission: 'Kandidat ini sudah pernah diajukan ke lowongan yang sama.',
  uq_invoice_milestone: 'Tagihan untuk tahap ini sudah ada pada penempatan tersebut.',
  uq_placement_replacement: 'Penempatan itu sudah punya satu penempatan pengganti.',
  chk_fee_range: 'Persentase fee harus antara 10% dan 30%.',
  chk_reason_required_when_open:
    'Lowongan tidak bisa dibuka sebelum pertanyaan "apa yang membuat kandidat sebelumnya ' +
    'tidak cocok" dijawab.',
  chk_salary_range: 'Gaji maksimal tidak boleh lebih kecil dari gaji minimal.',
  chk_start_after_offer: 'Tanggal mulai kerja tidak boleh sebelum tanggal tanda tangan penawaran.',
  chk_rejection_reason: 'Penolakan wajib menyebutkan siapa yang menolak dan alasannya.',
  chk_void_reason: 'Pembatalan wajib disertai alasan.',
}

/**
 * Mengembalikan kalimat Bahasa Indonesia untuk galat basis data yang sudah
 * dikenali, atau `null` bila galatnya bukan dari basis data. Galat yang tidak
 * dikenali sebaiknya dilempar ulang, bukan disamarkan jadi pesan umum.
 */
export function pesanGalatBasisData(galat: unknown): string | null {
  const g = bacaGalat(galat)
  if (!g) return null

  if (g.constraint && PESAN_CONSTRAINT[g.constraint]) {
    return PESAN_CONSTRAINT[g.constraint]!
  }

  switch (g.code) {
    case '23505':
      return 'Data ini sudah ada di basis data.'
    case '23514':
      return 'Ada isian yang tidak memenuhi aturan yang ditetapkan. Periksa kembali nilainya.'
    case '23503':
      return 'Data yang dirujuk tidak ditemukan, atau masih dipakai catatan lain.'
    default:
      return null
  }
}
