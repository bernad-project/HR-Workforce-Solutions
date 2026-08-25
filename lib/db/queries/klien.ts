import { and, asc, desc, eq, ilike, isNull, or, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { clientAgreements, clients, jobs } from '@/lib/db/schema'
import type { DataKlien, DataPerjanjian } from '@/lib/validation/klien'

export type BarisDaftarKlien = {
  id: string
  name: string
  industry: string | null
  picName: string | null
  picPhone: string | null
  status: 'prospect' | 'active' | 'dormant' | 'blacklist'
  lowonganTerbuka: number
  punyaPerjanjian: boolean
}

/**
 * Daftar klien beserta jumlah lowongan yang sedang terbuka.
 *
 * Klien yang sudah dihapus tidak ikut. Penghapusan di sistem ini selalu lunak
 * (`deleted_at`), tidak pernah menghilangkan baris.
 */
export async function daftarKlien(filter: { cari?: string; status?: string } = {}): Promise<
  BarisDaftarKlien[]
> {
  const syarat = [isNull(clients.deletedAt)]
  if (filter.cari) {
    const pola = `%${filter.cari}%`
    syarat.push(or(ilike(clients.name, pola), ilike(clients.picName, pola))!)
  }
  if (filter.status) {
    syarat.push(eq(clients.status, filter.status as BarisDaftarKlien['status']))
  }

  const baris = await db
    .select({
      id: clients.id,
      name: clients.name,
      industry: clients.industry,
      picName: clients.picName,
      picPhone: clients.picPhone,
      status: clients.status,
      lowonganTerbuka: sql<number>`count(distinct ${jobs.id}) filter (where ${jobs.status} = 'open' and ${jobs.deletedAt} is null)`.mapWith(
        Number,
      ),
      punyaPerjanjian: sql<boolean>`bool_or(${clientAgreements.id} is not null and ${clientAgreements.isActive})`.mapWith(
        Boolean,
      ),
    })
    .from(clients)
    .leftJoin(jobs, eq(jobs.clientId, clients.id))
    .leftJoin(clientAgreements, eq(clientAgreements.clientId, clients.id))
    .where(and(...syarat))
    .groupBy(clients.id)
    .orderBy(asc(clients.name))

  return baris.map((b) => ({ ...b, punyaPerjanjian: b.punyaPerjanjian ?? false }))
}

export async function ambilKlien(id: string) {
  const [klien] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, id), isNull(clients.deletedAt)))
    .limit(1)
  return klien ?? null
}

/**
 * Perjanjian sebuah klien.
 *
 * Isinya mengandung `fee_percent` — nilai fee. Peran `recruiter` tidak pernah
 * boleh melihatnya (CLAUDE.md poin 8), jadi pemanggil fungsi ini WAJIB sudah
 * memastikan penggunanya `owner`.
 */
export async function daftarPerjanjian(clientId: string) {
  return db
    .select()
    .from(clientAgreements)
    .where(eq(clientAgreements.clientId, clientId))
    .orderBy(desc(clientAgreements.isActive), desc(clientAgreements.createdAt))
}

export async function ambilPerjanjianAktif(clientId: string) {
  const [perjanjian] = await db
    .select()
    .from(clientAgreements)
    .where(and(eq(clientAgreements.clientId, clientId), eq(clientAgreements.isActive, true)))
    .orderBy(desc(clientAgreements.createdAt))
    .limit(1)
  return perjanjian ?? null
}

/** Daftar ringkas untuk kotak pilihan di form lowongan. */
export async function pilihanKlien() {
  return db
    .select({ id: clients.id, name: clients.name, status: clients.status })
    .from(clients)
    .where(isNull(clients.deletedAt))
    .orderBy(asc(clients.name))
}

export async function buatKlien(data: DataKlien, ownerUserId: string) {
  const [klien] = await db
    .insert(clients)
    .values({ ...data, ownerUserId })
    .returning({ id: clients.id })
  return klien!.id
}

export async function ubahKlien(id: string, data: DataKlien) {
  await db
    .update(clients)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(clients.id, id))
}

export async function buatPerjanjian(clientId: string, data: DataPerjanjian) {
  const [perjanjian] = await db
    .insert(clientAgreements)
    .values({
      clientId,
      agreementNumber: data.agreementNumber,
      signedDate: data.signedDate,
      startDate: data.startDate,
      endDate: data.endDate,
      feePercent: data.feePercent,
      splitFirstPercent: data.splitFirstPercent,
      guaranteeDays: data.guaranteeDays ?? 90,
      paymentTermsDays: data.paymentTermsDays ?? 7,
      protectionMonths: data.protectionMonths ?? 12,
      notes: data.notes,
    })
    .returning({ id: clientAgreements.id })
  return perjanjian!.id
}

/**
 * Menonaktifkan perjanjian lain milik klien yang sama.
 *
 * Perjanjian lama TIDAK dihapus. Tagihan yang sudah terbit memakai angka yang
 * disalin ke `placements`, jadi riwayatnya tetap utuh, tapi perjanjian lama
 * tidak lagi dipakai sebagai bawaan untuk lowongan baru.
 */
export async function nonaktifkanPerjanjianLain(clientId: string, kecualiId: string) {
  await db
    .update(clientAgreements)
    .set({ isActive: false })
    .where(and(eq(clientAgreements.clientId, clientId), sql`${clientAgreements.id} <> ${kecualiId}`))
}
