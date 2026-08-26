/**
 * Aturan tahapan pipeline — SPEC §6.1. Fungsi murni, bisa diuji tanpa basis data.
 *
 * Dua hal yang dijaga berkas ini:
 *
 * 1. **Setiap perpindahan tercatat.** Seluruh metrik di SPEC §12 dihitung dari
 *    `submission_events`, bukan dari kolom `stage`. Kolom `stage` hanya
 *    memberi tahu keadaan sekarang; ia tidak bisa menjawab "berapa lama dari
 *    diajukan sampai diwawancara klien".
 *
 * 2. **Tahap tidak melompat diam-diam.** Melompat dari `sourced` langsung ke
 *    `signed` berarti tidak ada baris wawancara internal, tidak ada tanggal
 *    pengajuan — dan `submitted_at` yang kosong adalah hilangnya dasar klaim
 *    fee. Melompat tetap boleh bagi pemilik, tapi harus disertai alasan yang
 *    ikut tersimpan.
 */
import type { TahapPengajuan } from '@/lib/db/schema'

/** Tahap yang berurutan. Urutan indeksnya adalah aturannya. */
export const URUTAN_TAHAP = [
  'sourced',
  'screened',
  'interviewed_internal',
  'submitted_to_client',
  'client_interview',
  'offer',
  'signed',
  'started',
  'guarantee_passed',
] as const

/** Tahap penutup. Tidak punya nomor urut — pipeline berhenti di sini. */
export const TAHAP_AKHIR = ['rejected', 'withdrawn'] as const

export const LABEL_TAHAP: Record<TahapPengajuan, string> = {
  sourced: 'Dikaitkan',
  screened: 'Lolos saringan',
  interviewed_internal: 'Diwawancara tim kami',
  submitted_to_client: 'Diajukan ke klien',
  client_interview: 'Wawancara klien',
  offer: 'Ditawari',
  signed: 'Tanda tangan',
  started: 'Mulai bekerja',
  guarantee_passed: 'Lolos garansi',
  rejected: 'Ditolak',
  withdrawn: 'Mundur',
}

export const KETERANGAN_TAHAP: Record<TahapPengajuan, string> = {
  sourced: 'Sudah dikaitkan ke lowongan, belum dihubungi.',
  screened: 'Gaji dan lokasi sudah dicek dan cocok.',
  interviewed_internal: 'Sudah diwawancara tim kami. Wajib sebelum diajukan ke klien.',
  submitted_to_client: 'Diajukan ke klien. Di sinilah masa proteksi 12 bulan mulai berjalan.',
  client_interview: 'Klien menjadwalkan wawancara.',
  offer: 'Klien memberi penawaran.',
  signed: 'Kandidat menandatangani kontrak. Memicu tagihan pertama.',
  started: 'Kandidat mulai bekerja. Memicu hitungan masa garansi.',
  guarantee_passed: 'Lolos masa percobaan. Memicu tagihan kedua.',
  rejected: 'Tidak diteruskan — oleh kami atau oleh klien.',
  withdrawn: 'Kandidat mengundurkan diri dari proses ini.',
}

export function apakahTahapAkhir(tahap: TahapPengajuan): boolean {
  return (TAHAP_AKHIR as readonly string[]).includes(tahap)
}

/** Nomor urut tahap, atau `null` untuk tahap penutup. */
export function nomorTahap(tahap: TahapPengajuan): number | null {
  const i = (URUTAN_TAHAP as readonly string[]).indexOf(tahap)
  return i === -1 ? null : i
}

/**
 * Tahap `submitted_to_client` dan sesudahnya berarti kandidat sudah sampai ke
 * klien. Dipakai untuk memutuskan apa yang boleh dilihat portal klien (Fase 5)
 * dan untuk menandai pengajuan yang sudah berstempel waktu.
 */
export function sudahSampaiKlien(tahap: TahapPengajuan): boolean {
  const n = nomorTahap(tahap)
  return n !== null && n >= nomorTahap('submitted_to_client')!
}

export type HasilPeriksaTahap =
  | { boleh: true; perluCatatan: boolean; peringatan?: string }
  | { boleh: false; alasan: string }

/**
 * Boleh tidaknya sebuah perpindahan tahap, menurut SPEC §6.1:
 *
 *   · Maju hanya satu tahap — kecuali `owner`, yang boleh melompat dengan alasan.
 *   · Mundur diperbolehkan, dan selalu tercatat.
 *   · Tahap penutup bisa dicapai dari mana saja: kandidat bisa mundur kapan
 *     saja, dan klien bisa menolak di titik mana pun.
 *   · Membuka kembali pengajuan yang sudah ditutup boleh, tapi wajib beralasan —
 *     kalau tidak, riwayatnya jadi mustahil dibaca setahun kemudian.
 */
export function periksaPerpindahan(
  dari: TahapPengajuan,
  ke: TahapPengajuan,
  peran: 'owner' | 'recruiter',
): HasilPeriksaTahap {
  if (dari === ke) {
    return { boleh: false, alasan: 'Pengajuan sudah berada di tahap itu.' }
  }

  if (apakahTahapAkhir(ke)) {
    return { boleh: true, perluCatatan: false }
  }

  if (apakahTahapAkhir(dari)) {
    return {
      boleh: true,
      perluCatatan: true,
      peringatan:
        `Pengajuan ini sudah ditutup sebagai "${LABEL_TAHAP[dari]}". ` +
        'Membukanya kembali boleh, tapi tuliskan alasannya supaya riwayatnya tetap terbaca.',
    }
  }

  const dariNomor = nomorTahap(dari)!
  const keNomor = nomorTahap(ke)!
  const selisih = keNomor - dariNomor

  if (selisih === 1) return { boleh: true, perluCatatan: false }

  if (selisih < 0) {
    return {
      boleh: true,
      perluCatatan: false,
      peringatan: 'Mundur satu tahap atau lebih. Perpindahan ini ikut tercatat di riwayat.',
    }
  }

  // Melompat maju.
  if (peran !== 'owner') {
    const berikutnya = URUTAN_TAHAP[dariNomor + 1]!
    return {
      boleh: false,
      alasan:
        `Tahap hanya bisa maju satu langkah. Dari "${LABEL_TAHAP[dari]}", ` +
        `tahap berikutnya adalah "${LABEL_TAHAP[berikutnya]}". ` +
        'Melompat beberapa tahap sekaligus hanya bisa dilakukan pemilik, disertai alasan.',
    }
  }

  return {
    boleh: true,
    perluCatatan: true,
    peringatan:
      `Melompati ${selisih - 1} tahap. Tahap yang dilewati tidak akan punya catatan waktu, ` +
      'dan metrik seperti rasio ajuan ke wawancara jadi ikut meleset. Tuliskan alasannya.',
  }
}

/**
 * Tahap yang wajar ditawarkan sebagai tombol berikutnya.
 *
 * Bukan pembatasan — hanya urutan tampilan, supaya tombol yang paling sering
 * dipakai ada di depan.
 */
export function tahapBerikutnya(dari: TahapPengajuan): TahapPengajuan | null {
  const n = nomorTahap(dari)
  if (n === null) return null
  return URUTAN_TAHAP[n + 1] ?? null
}

export type PilihanPerpindahan = {
  tahap: TahapPengajuan
  izin: Extract<HasilPeriksaTahap, { boleh: true }>
}

/**
 * Tahap tujuan yang boleh dipilih, SUDAH DIURUTKAN menurut kemungkinan
 * dipakainya.
 *
 * Urutannya bukan hiasan. Kotak pilihan mengambil isian pertama sebagai nilai
 * bawaan, jadi kalau daftarnya diurutkan menurut urutan enum, pengajuan yang
 * sudah sampai `signed` akan terbuka dengan pilihan bawaan `sourced` — sebuah
 * langkah mundur sembilan tahap. Satu klik yang tidak diperiksa ulang, dan
 * riwayatnya tercemar.
 *
 * Urutan yang dipakai:
 *   1. tahap berikutnya — yang hampir selalu dimaksud
 *   2. tahap maju lain — hanya muncul untuk pemilik, dan tetap wajib beralasan
 *   3. tahap penutup — ditolak dan mundur
 *   4. tahap mundur — yang terdekat lebih dulu
 */
export function pilihanPerpindahan(
  dari: TahapPengajuan,
  peran: 'owner' | 'recruiter',
): PilihanPerpindahan[] {
  const semua = [...URUTAN_TAHAP, ...TAHAP_AKHIR] as TahapPengajuan[]
  const berikut = tahapBerikutnya(dari)
  const dariNomor = nomorTahap(dari)

  const boleh: PilihanPerpindahan[] = []
  for (const tahap of semua) {
    const izin = periksaPerpindahan(dari, tahap, peran)
    if (izin.boleh) boleh.push({ tahap, izin })
  }

  function golongan(tahap: TahapPengajuan): number {
    if (tahap === berikut) return 0
    if (apakahTahapAkhir(tahap)) return 2
    const n = nomorTahap(tahap)!
    if (dariNomor === null) return 1 // dibuka kembali dari tahap penutup
    return n > dariNomor ? 1 : 3
  }

  return boleh.sort((a, b) => {
    const beda = golongan(a.tahap) - golongan(b.tahap)
    if (beda !== 0) return beda
    // Di dalam golongan mundur, yang paling dekat lebih dulu.
    if (golongan(a.tahap) === 3) return nomorTahap(b.tahap)! - nomorTahap(a.tahap)!
    return semua.indexOf(a.tahap) - semua.indexOf(b.tahap)
  })
}
