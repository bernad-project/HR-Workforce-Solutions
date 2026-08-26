/**
 * Masa proteksi kandidat — SPEC §5.5, Pasal 4 perjanjian jasa rekrutmen.
 *
 * Isi aturannya: selama 12 bulan sejak kandidat diajukan, klien tidak boleh
 * merekrut orang itu lewat jalur lain. Kalau ia tetap direkrut, fee tetap
 * terutang — dan yang membuktikannya adalah stempel waktu pengajuan.
 *
 * Yang dihitung di sini bukan angka hiasan. Ia menjawab satu pertanyaan yang
 * suatu hari akan ditanyakan dalam sengketa: "pada tanggal itu, apakah kandidat
 * ini masih dalam masa proteksi terhadap klien tersebut?"
 *
 * Fungsi murni: tidak menyentuh basis data, tidak membaca jam sistem. Tanggal
 * acuan selalu diberikan pemanggilnya, supaya hasilnya bisa diuji dan supaya
 * tidak ada jawaban yang berubah karena kode kebetulan berjalan di zona waktu
 * lain (CLAUDE.md "Waktu").
 */
import { selisihHari, tambahBulan } from './tanggal'

export type HasilProteksi = {
  /** Masih dalam masa proteksi pada tanggal yang ditanyakan. */
  terlindungi: boolean
  /** Tanggal terakhir proteksi masih berlaku, `YYYY-MM-DD`. */
  berakhirPada: string
  /** Sisa hari sampai proteksi berakhir. 0 berarti hari ini hari terakhirnya. */
  sisaHari: number
}

/**
 * @param pertamaDiajukan Tanggal Jakarta dari pengajuan PALING AWAL untuk
 *   pasangan (kandidat, klien) ini. SPEC §5.6: "yang pertama `submitted_at`
 *   yang memiliki" — pengajuan berikutnya tidak memperpanjang apa pun.
 * @param bulanProteksi Diambil dari `client_agreements.protection_months`
 *   milik perjanjian yang dipakai lowongan itu. Bawaan 12.
 * @param padaTanggal Tanggal yang ditanyakan, biasanya hari ini di Jakarta.
 */
export function cekMasaProteksi(
  pertamaDiajukan: string,
  bulanProteksi: number,
  padaTanggal: string,
): HasilProteksi {
  const berakhirPada = tambahBulan(pertamaDiajukan, bulanProteksi)
  const sisaHari = selisihHari(padaTanggal, berakhirPada)

  /**
   * Batasnya INKLUSIF: pada hari yang persis 12 bulan setelah pengajuan,
   * kandidat masih dihitung terlindungi.
   *
   * Basis data memakai perbandingan stempel waktu (`protection_until > now()`),
   * jadi menurut basis data proteksi berakhir di jam yang sama dengan jam
   * pengajuan dulu, bukan di tengah malam. Selisih keduanya paling banyak satu
   * hari, dan arahnya sengaja dipilih begini: fungsi ini dipakai untuk
   * MEMPERINGATKAN sebelum mengajukan. Peringatan yang muncul beberapa jam
   * terlalu lama tidak merugikan siapa pun; peringatan yang telat sehari bisa
   * berarti satu fee tidak tertagih.
   */
  return { terlindungi: sisaHari >= 0, berakhirPada, sisaHari }
}
