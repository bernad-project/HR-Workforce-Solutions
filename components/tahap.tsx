import { Badge, type NadaBadge } from '@/components/ui/badge'
import { LABEL_TAHAP } from '@/lib/rules/tahapan'
import type { TahapPengajuan } from '@/lib/db/schema'

/**
 * Warna tahap pipeline.
 *
 * Yang dibedakan bukan sekadar urutan, tapi apa artinya bagi uang:
 *   · abu-abu  — masih di tangan kami, belum menyentuh klien
 *   · biru     — sudah sampai ke klien, masa proteksi 12 bulan berjalan
 *   · kuning   — sedang ditawari, belum pasti
 *   · hijau    — sudah menghasilkan atau akan menghasilkan tagihan
 *   · merah    — berhenti
 */
const NADA_TAHAP: Record<TahapPengajuan, NadaBadge> = {
  sourced: 'netral',
  screened: 'netral',
  interviewed_internal: 'netral',
  submitted_to_client: 'utama',
  client_interview: 'utama',
  offer: 'hangat',
  signed: 'aman',
  started: 'aman',
  guarantee_passed: 'aman',
  rejected: 'bahaya',
  withdrawn: 'netral',
}

export function BadgeTahap({ tahap }: { tahap: TahapPengajuan }) {
  return <Badge nada={NADA_TAHAP[tahap]}>{LABEL_TAHAP[tahap]}</Badge>
}

export function nadaTahap(tahap: TahapPengajuan): NadaBadge {
  return NADA_TAHAP[tahap]
}
