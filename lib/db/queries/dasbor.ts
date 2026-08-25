import { and, count, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { candidates, clients, companySettings, jobs, submissions } from '@/lib/db/schema'

/**
 * Ringkasan dasbor Fase 0.
 *
 * Sengaja hanya berisi jumlah baris — tidak ada nilai uang. Metrik penuh di
 * SPEC §12 dihitung dari `submission_events` dan baru bisa dibangun setelah
 * Fase 2 dan Fase 3 selesai.
 */
export type RingkasanDasbor = {
  klienAktif: number
  lowonganTerbuka: number
  kandidat: number
  pengajuanAktif: number
}

export async function ambilRingkasanDasbor(): Promise<RingkasanDasbor> {
  const [klienAktif, lowonganTerbuka, jumlahKandidat, pengajuanAktif] = await Promise.all([
    db
      .select({ n: count() })
      .from(clients)
      .where(and(eq(clients.status, 'active'), isNull(clients.deletedAt))),
    db
      .select({ n: count() })
      .from(jobs)
      .where(and(eq(jobs.status, 'open'), isNull(jobs.deletedAt))),
    db
      .select({ n: count() })
      .from(candidates)
      .where(and(eq(candidates.status, 'active'), isNull(candidates.deletedAt))),
    db.select({ n: count() }).from(submissions).where(isNull(submissions.withdrawnAt)),
  ])

  return {
    klienAktif: klienAktif[0]?.n ?? 0,
    lowonganTerbuka: lowonganTerbuka[0]?.n ?? 0,
    kandidat: jumlahKandidat[0]?.n ?? 0,
    pengajuanAktif: pengajuanAktif[0]?.n ?? 0,
  }
}

export async function ambilPengaturanPerusahaan() {
  const [pengaturan] = await db.select().from(companySettings).where(eq(companySettings.id, 1)).limit(1)
  return pengaturan ?? null
}
