import { put, del, get } from '@vercel/blob'

/**
 * Penyimpanan berkas: CV dan dokumen kandidat.
 *
 * Berkas TIDAK disimpan di basis data (CLAUDE.md "Basis data dan hosting").
 * Yang masuk ke tabel `candidate_documents` hanya kuncinya; isinya di Vercel Blob.
 *
 * Berkas disimpan `private`. Artinya alamatnya tidak bisa dibuka siapa pun yang
 * kebetulan punya tautannya — setiap pengambilan harus lewat aplikasi ini dan
 * melewati pemeriksaan sesi lebih dulu. Untuk CV yang berisi nama, nomor
 * telepon, dan riwayat kerja orang, itu bukan pilihan tambahan (SPEC §9).
 */

const JENIS_DIIZINKAN: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'doc',
}

export const UKURAN_MAKSIMAL_BYTE = 10 * 1024 * 1024 // 10 MB

export class GalatUnggah extends Error {}

function pastikanTokenAda(): void {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new GalatUnggah(
      'Penyimpanan berkas belum tersambung. Tambahkan Vercel Blob di proyek Vercel Anda, ' +
        'lalu isi BLOB_READ_WRITE_TOKEN. Sampai itu dilakukan, data kandidat tetap bisa ' +
        'dimasukkan — hanya unggah CV yang belum jalan.',
    )
  }
}

export function penyimpananSiap(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN)
}

/** Memeriksa berkas sebelum menyentuh jaringan, supaya pesan galatnya jelas. */
export function periksaBerkas(berkas: File): void {
  if (berkas.size === 0) {
    throw new GalatUnggah('Berkas kosong.')
  }
  if (berkas.size > UKURAN_MAKSIMAL_BYTE) {
    const mb = (berkas.size / 1024 / 1024).toFixed(1)
    throw new GalatUnggah(`Berkas ${mb} MB terlalu besar. Batasnya 10 MB.`)
  }
  if (!JENIS_DIIZINKAN[berkas.type]) {
    throw new GalatUnggah('Hanya berkas PDF, DOC, atau DOCX yang bisa diunggah.')
  }
}

export type HasilUnggah = {
  fileKey: string
  fileName: string
  mimeType: string
  sizeBytes: bigint
}

/**
 * Mengunggah satu dokumen kandidat.
 *
 * Nama berkas asli disimpan di kolom `file_name` supaya perekrut mengenalinya,
 * tapi tidak menentukan alamat penyimpanannya. Yang disimpan sebagai `file_key`
 * adalah `pathname`, bukan URL — untuk berkas private, URL-nya tidak berguna
 * tanpa kredensial, dan pathname inilah yang dipakai saat mengambil kembali.
 */
export async function unggahDokumen(candidateId: string, berkas: File): Promise<HasilUnggah> {
  periksaBerkas(berkas)
  pastikanTokenAda()

  const ekstensi = JENIS_DIIZINKAN[berkas.type]
  const hasil = await put(`kandidat/${candidateId}/${Date.now()}.${ekstensi}`, berkas, {
    access: 'private',
    addRandomSuffix: true,
    contentType: berkas.type,
  })

  return {
    fileKey: hasil.pathname,
    fileName: berkas.name,
    mimeType: berkas.type,
    sizeBytes: BigInt(berkas.size),
  }
}

/**
 * Mengambil isi dokumen sebagai aliran data.
 *
 * Pemanggilnya bertanggung jawab memeriksa sesi lebih dulu dan mencatat
 * `download_cv` ke jejak audit — lihat `app/api/dokumen/[id]/route.ts`.
 */
export async function ambilDokumen(fileKey: string) {
  pastikanTokenAda()
  return get(fileKey, { access: 'private' })
}

/**
 * Menghapus berkas dari penyimpanan.
 *
 * Dipakai saat kandidat memakai hak penghapusan (SPEC §9.2): berkas dokumennya
 * dihapus, tapi baris `submissions` dan `placements` tetap ada dalam bentuk
 * teranonimkan karena keduanya catatan keuangan dan bukti perjanjian.
 */
export async function hapusDokumen(fileKey: string): Promise<void> {
  pastikanTokenAda()
  await del(fileKey)
}
