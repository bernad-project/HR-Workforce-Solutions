import { headers } from 'next/headers'
import { db } from '@/lib/db'
import { auditLog } from '@/lib/db/schema'

/**
 * Jejak audit akses data pribadi — SPEC §9.4.
 *
 * Bila terjadi kebocoran, kewajiban pemberitahuan adalah 3×24 jam. Tanpa catatan
 * ini, mustahil menjawab pertanyaan "data siapa saja yang terdampak" dalam waktu
 * itu.
 *
 * Yang wajib dicatat: setiap akses `client_viewer` ke data kandidat (Fase 5) dan
 * setiap ekspor data (Fase 7). Fungsi ini sudah dipakai sejak Fase 1 untuk
 * pembuatan dan perubahan kandidat, supaya riwayatnya utuh sejak baris pertama.
 */
export type AksiAudit =
  | 'create_candidate'
  | 'update_candidate'
  | 'delete_candidate'
  | 'view_candidate'
  | 'download_cv'
  | 'upload_cv'
  | 'export_data'
  | 'grant_consent'
  | 'withdraw_consent'
  | 'delete_request'

type CatatanAudit = {
  actorType: 'user' | 'client' | 'system'
  actorId?: string | null
  action: AksiAudit
  entityType?: string | null
  entityId?: string | null
  detail?: Record<string, unknown> | null
}

/**
 * Menulis satu baris jejak audit.
 *
 * Kegagalan penulisan audit sengaja tidak menggagalkan aksi yang sedang berjalan
 * — kandidat yang sudah tersimpan tidak boleh hilang gara-gara pencatatan gagal.
 * Tapi kegagalannya dicetak ke log server supaya tidak lewat begitu saja.
 */
export async function catatAudit(catatan: CatatanAudit): Promise<void> {
  try {
    let ip: string | null = null
    let userAgent: string | null = null

    try {
      const h = await headers()
      // Vercel menaruh alamat asli pengunjung di header ini; koneksi langsung
      // ke server hanya terlihat sebagai alamat proksi.
      ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? null
      userAgent = h.get('user-agent')
    } catch {
      // Dipanggil di luar konteks permintaan (misalnya dari skrip).
    }

    await db.insert(auditLog).values({
      actorType: catatan.actorType,
      actorId: catatan.actorId ?? null,
      action: catatan.action,
      entityType: catatan.entityType ?? null,
      entityId: catatan.entityId ?? null,
      ipAddress: ip,
      userAgent,
      detail: catatan.detail ?? null,
    })
  } catch (galat) {
    console.error('[audit] gagal mencatat:', catatan.action, galat)
  }
}
