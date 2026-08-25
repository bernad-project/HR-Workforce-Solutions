import { and, asc, desc, eq, ilike, isNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { clientAgreements, clients, jobs, submissions } from '@/lib/db/schema'
import type { DataLowongan } from '@/lib/validation/lowongan'

export type BarisDaftarLowongan = {
  id: string
  title: string
  status: 'draft' | 'open' | 'on_hold' | 'filled' | 'cancelled' | 'lost'
  headcount: number
  location: string | null
  salaryMin: bigint | null
  salaryMax: bigint | null
  clientId: string
  clientName: string
  openedAt: Date | null
  jumlahPengajuan: number
}

export async function daftarLowongan(
  filter: { cari?: string; status?: string; klien?: string } = {},
): Promise<BarisDaftarLowongan[]> {
  const syarat = [isNull(jobs.deletedAt)]
  if (filter.cari) syarat.push(ilike(jobs.title, `%${filter.cari}%`))
  if (filter.status) syarat.push(eq(jobs.status, filter.status as BarisDaftarLowongan['status']))
  if (filter.klien) syarat.push(eq(jobs.clientId, filter.klien))

  return db
    .select({
      id: jobs.id,
      title: jobs.title,
      status: jobs.status,
      headcount: jobs.headcount,
      location: jobs.location,
      salaryMin: jobs.salaryMin,
      salaryMax: jobs.salaryMax,
      clientId: clients.id,
      clientName: clients.name,
      openedAt: jobs.openedAt,
      jumlahPengajuan: sql<number>`count(distinct ${submissions.id})`.mapWith(Number),
    })
    .from(jobs)
    .innerJoin(clients, eq(clients.id, jobs.clientId))
    .leftJoin(submissions, eq(submissions.jobId, jobs.id))
    .where(and(...syarat))
    .groupBy(jobs.id, clients.id)
    .orderBy(desc(jobs.createdAt))
}

export async function ambilLowongan(id: string) {
  const [baris] = await db
    .select({
      lowongan: jobs,
      klien: { id: clients.id, name: clients.name, picName: clients.picName },
    })
    .from(jobs)
    .innerJoin(clients, eq(clients.id, jobs.clientId))
    .where(and(eq(jobs.id, id), isNull(jobs.deletedAt)))
    .limit(1)
  return baris ?? null
}

export async function daftarLowonganKlien(clientId: string) {
  return db
    .select({
      id: jobs.id,
      title: jobs.title,
      status: jobs.status,
      headcount: jobs.headcount,
      openedAt: jobs.openedAt,
    })
    .from(jobs)
    .where(and(eq(jobs.clientId, clientId), isNull(jobs.deletedAt)))
    .orderBy(desc(jobs.createdAt))
}

/**
 * Perjanjian semua klien, untuk kotak pilihan di form lowongan.
 *
 * Sengaja TIDAK mengambil `fee_percent`. Form lowongan bisa dibuka peran
 * `recruiter`, dan peran itu tidak pernah melihat nilai fee (CLAUDE.md poin 8).
 * Yang keluar dari sini hanya penanda dokumen — nomor dan tanggalnya.
 */
export async function semuaPerjanjianRingkas() {
  return db
    .select({
      id: clientAgreements.id,
      clientId: clientAgreements.clientId,
      agreementNumber: clientAgreements.agreementNumber,
      signedDate: clientAgreements.signedDate,
      isActive: clientAgreements.isActive,
    })
    .from(clientAgreements)
    .orderBy(desc(clientAgreements.isActive), asc(clientAgreements.createdAt))
}

/**
 * `opened_at` diisi saat lowongan pertama kali dibuka, dan tidak ditulis ulang
 * bila lowongan ditutup lalu dibuka lagi. Metrik "waktu pengisian" (SPEC §12)
 * dihitung dari tanggal ini, jadi ia harus menunjuk ke saat kebutuhan klien
 * benar-benar mulai berjalan.
 */
function hitungOpenedAt(statusBaru: string, openedAtLama: Date | null): Date | null {
  if (statusBaru === 'open' && openedAtLama === null) return new Date()
  return openedAtLama
}

function hitungClosedAt(statusBaru: string, closedAtLama: Date | null): Date | null {
  const statusTutup = ['filled', 'cancelled', 'lost']
  if (statusTutup.includes(statusBaru)) return closedAtLama ?? new Date()
  return null
}

export async function buatLowongan(data: DataLowongan, ownerUserId: string) {
  const [lowongan] = await db
    .insert(jobs)
    .values({
      clientId: data.clientId,
      agreementId: data.agreementId,
      title: data.title,
      headcount: data.headcount,
      location: data.location,
      employmentType: data.employmentType,
      salaryMin: data.salaryMin,
      salaryMax: data.salaryMax,
      mustHave: data.mustHave,
      niceToHave: data.niceToHave,
      reasonPreviousFailed: data.reasonPreviousFailed,
      decisionMaker: data.decisionMaker,
      interviewer: data.interviewer,
      vacancyAgeNote: data.vacancyAgeNote,
      targetStartDate: data.targetStartDate,
      screeningQuestions: data.screeningQuestions,
      status: data.status,
      ownerUserId,
      openedAt: hitungOpenedAt(data.status, null),
      closedAt: hitungClosedAt(data.status, null),
    })
    .returning({ id: jobs.id })
  return lowongan!.id
}

export async function ubahLowongan(id: string, data: DataLowongan) {
  const [lama] = await db
    .select({ openedAt: jobs.openedAt, closedAt: jobs.closedAt })
    .from(jobs)
    .where(eq(jobs.id, id))
    .limit(1)

  await db
    .update(jobs)
    .set({
      clientId: data.clientId,
      agreementId: data.agreementId,
      title: data.title,
      headcount: data.headcount,
      location: data.location,
      employmentType: data.employmentType,
      salaryMin: data.salaryMin,
      salaryMax: data.salaryMax,
      mustHave: data.mustHave,
      niceToHave: data.niceToHave,
      reasonPreviousFailed: data.reasonPreviousFailed,
      decisionMaker: data.decisionMaker,
      interviewer: data.interviewer,
      vacancyAgeNote: data.vacancyAgeNote,
      targetStartDate: data.targetStartDate,
      screeningQuestions: data.screeningQuestions,
      status: data.status,
      openedAt: hitungOpenedAt(data.status, lama?.openedAt ?? null),
      closedAt: hitungClosedAt(data.status, lama?.closedAt ?? null),
      updatedAt: new Date(),
    })
    .where(eq(jobs.id, id))
}
