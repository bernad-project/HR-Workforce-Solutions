import { auth } from '@/lib/auth'
import { catatAudit } from '@/lib/audit'
import { ambilDokumenById } from '@/lib/db/queries/kandidat'
import { ambilDokumen, GalatUnggah } from '@/lib/storage'

/**
 * Mengunduh dokumen kandidat.
 *
 * Ini salah satu dari sedikit tempat yang boleh memakai route handler, karena
 * yang dikirim adalah berkas, bukan halaman (CLAUDE.md "Konvensi kode").
 *
 * Berkas disimpan private di Vercel Blob, jadi tautannya tidak bisa dibuka
 * langsung. Setiap pengambilan lewat sini, dan setiap pengambilan tercatat di
 * jejak audit — kewajiban SPEC §9.4.
 */
export async function GET(_permintaan: Request, konteks: { params: Promise<{ id: string }> }) {
  const sesi = await auth()
  if (!sesi?.user) {
    return new Response('Belum masuk', { status: 401 })
  }

  const { id } = await konteks.params
  const dokumen = await ambilDokumenById(id)
  if (!dokumen) {
    return new Response('Dokumen tidak ditemukan', { status: 404 })
  }

  let hasil
  try {
    hasil = await ambilDokumen(dokumen.fileKey)
  } catch (galat) {
    if (galat instanceof GalatUnggah) {
      return new Response(galat.message, { status: 503 })
    }
    throw galat
  }

  if (!hasil || hasil.stream === null) {
    return new Response('Berkas tidak ditemukan di penyimpanan', { status: 404 })
  }

  await catatAudit({
    actorType: 'user',
    actorId: sesi.user.id,
    action: 'download_cv',
    entityType: 'candidate',
    entityId: dokumen.candidateId,
    detail: { documentId: dokumen.id, namaBerkas: dokumen.fileName },
  })

  // Nama berkas dikutip dan di-encode supaya nama yang mengandung koma, tanda
  // kutip, atau huruf non-ASCII tidak merusak header.
  const namaAman = encodeURIComponent(dokumen.fileName)

  return new Response(hasil.stream, {
    headers: {
      'Content-Type': dokumen.mimeType ?? 'application/octet-stream',
      'Content-Disposition': `inline; filename*=UTF-8''${namaAman}`,
      'Cache-Control': 'private, no-store',
    },
  })
}
