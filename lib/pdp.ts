/**
 * Teks pemberitahuan dan persetujuan pemrosesan data pribadi.
 *
 * UU No. 27 Tahun 2022 berlaku penuh sejak Oktober 2024, dengan sanksi
 * administratif sampai 2% pendapatan tahunan. Sistem ini adalah pengendali data
 * pribadi, jadi setiap kandidat harus punya catatan persetujuan sebelum datanya
 * dipakai untuk diajukan ke klien (SPEC §9.1).
 *
 * Teks di bawah diberi nomor versi dan disimpan bersama persetujuannya. Bila
 * suatu hari teksnya berubah, catatan lama tetap menunjuk ke teks yang benar-
 * benar disetujui kandidat waktu itu — bukan ke teks yang berlaku hari ini.
 * Itu sebabnya versi lama tidak boleh dihapus dari berkas ini.
 */

export const VERSI_PEMBERITAHUAN_BERLAKU = '2026-08-v1'

export const TUJUAN_PEMROSESAN =
  'Proses rekrutmen: penyaringan, pengajuan ke perusahaan klien, dan komunikasi terkait lowongan.'

/**
 * Tiga hal yang wajib disebut menurut SPEC §9.1 dan CLAUDE.md:
 * data dibagikan ke klien, diproses dengan bantuan AI pihak ketiga, dan disimpan
 * 24 bulan sejak aktivitas terakhir. Ditambah hak menarik persetujuan.
 */
export const POIN_PEMBERITAHUAN = [
  'Data Anda kami pakai untuk proses rekrutmen — menyaring, mengajukan, dan menghubungi Anda soal lowongan.',
  'Data Anda kami bagikan kepada perusahaan klien yang lowongannya Anda lamar.',
  'Data Anda diproses dengan bantuan layanan kecerdasan buatan (AI) pihak ketiga untuk membaca CV dan menilai kecocokan. Penilaian itu hanya saran; keputusan tetap di tangan manusia, dan Anda berhak menolak dinilai secara otomatis.',
  'Data Anda kami simpan selama 24 bulan sejak aktivitas terakhir Anda bersama kami.',
  'Anda bisa menarik persetujuan ini kapan saja. Setelah ditarik, data Anda tidak lagi kami pakai untuk pengajuan baru.',
] as const

export const RINGKASAN_PEMBERITAHUAN =
  'Dengan melanjutkan, kandidat menyatakan telah membaca dan menyetujui pemberitahuan pemrosesan data pribadi di atas.'

/** Pilihan saluran persetujuan, sesuai enum `consent_method` di basis data. */
export const SALURAN_PERSETUJUAN = [
  { nilai: 'form_daring', label: 'Formulir daring' },
  { nilai: 'whatsapp', label: 'WhatsApp' },
  { nilai: 'email', label: 'Email' },
  { nilai: 'kertas', label: 'Kertas / tanda tangan basah' },
] as const

/**
 * Bidang yang sengaja TIDAK ada di sistem ini — SPEC §9.5.
 * Dipakai sebagai pengingat di layar, supaya tidak ada yang menuliskannya ke
 * kolom catatan. Data yang tidak disimpan tidak bisa bocor.
 */
export const JANGAN_DISIMPAN = ['NIK', 'foto', 'agama', 'status pernikahan', 'nomor rekening'] as const
