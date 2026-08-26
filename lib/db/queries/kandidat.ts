import { and, arrayContains, count, desc, eq, ilike, isNull, or, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  candidateConsents,
  candidateDocuments,
  candidates,
  companySettings,
} from '@/lib/db/schema'
import { normalisasiEmail, normalisasiTelepon } from '@/lib/rules/duplikat'
import { hitungRetentionUntil } from '@/lib/rules/tanggal'
import { tanggalHariIniJakarta } from '@/lib/format'
import { TUJUAN_PEMROSESAN, VERSI_PEMBERITAHUAN_BERLAKU } from '@/lib/pdp'
import type { DataKandidat } from '@/lib/validation/kandidat'

export type BarisDaftarKandidat = {
  id: string
  fullName: string
  phone: string | null
  email: string | null
  domicileCity: string | null
  currentTitle: string | null
  currentCompany: string | null
  yearsExperience: string | null
  expectedSalary: bigint | null
  skills: string[]
  status: 'active' | 'placed' | 'withdrawn' | 'blacklist'
  lastActivityAt: Date
  punyaCv: boolean
}

/**
 * Pencarian kandidat.
 *
 * `current_salary` sengaja tidak ikut diambil di daftar ini. Ia hanya muncul di
 * halaman detail, dan tidak pernah di jalur mana pun yang bisa dilihat
 * `client_viewer` (CLAUDE.md poin 7).
 */
export async function daftarKandidat(
  filter: { cari?: string; keahlian?: string; status?: string; kota?: string } = {},
): Promise<BarisDaftarKandidat[]> {
  const syarat = [isNull(candidates.deletedAt)]

  if (filter.cari) {
    const pola = `%${filter.cari}%`
    syarat.push(
      or(
        ilike(candidates.fullName, pola),
        ilike(candidates.currentCompany, pola),
        ilike(candidates.currentTitle, pola),
        ilike(candidates.phone, pola),
        ilike(candidates.email, pola),
      )!,
    )
  }
  if (filter.keahlian) syarat.push(arrayContains(candidates.skills, [filter.keahlian]))
  if (filter.status) syarat.push(eq(candidates.status, filter.status as BarisDaftarKandidat['status']))
  if (filter.kota) syarat.push(ilike(candidates.domicileCity, `%${filter.kota}%`))

  return db
    .select({
      id: candidates.id,
      fullName: candidates.fullName,
      phone: candidates.phone,
      email: candidates.email,
      domicileCity: candidates.domicileCity,
      currentTitle: candidates.currentTitle,
      currentCompany: candidates.currentCompany,
      yearsExperience: candidates.yearsExperience,
      expectedSalary: candidates.expectedSalary,
      skills: candidates.skills,
      status: candidates.status,
      lastActivityAt: candidates.lastActivityAt,
      punyaCv: sql<boolean>`bool_or(${candidateDocuments.id} is not null and ${candidateDocuments.type} = 'cv')`.mapWith(
        Boolean,
      ),
    })
    .from(candidates)
    .leftJoin(candidateDocuments, eq(candidateDocuments.candidateId, candidates.id))
    .where(and(...syarat))
    .groupBy(candidates.id)
    .orderBy(desc(candidates.lastActivityAt))
    .limit(200)
}

export async function ambilKandidat(id: string) {
  const [kandidat] = await db
    .select()
    .from(candidates)
    .where(and(eq(candidates.id, id), isNull(candidates.deletedAt)))
    .limit(1)
  return kandidat ?? null
}

export async function daftarDokumen(candidateId: string) {
  return db
    .select()
    .from(candidateDocuments)
    .where(eq(candidateDocuments.candidateId, candidateId))
    .orderBy(desc(candidateDocuments.uploadedAt))
}

export async function ambilDokumenById(id: string) {
  const [dokumen] = await db
    .select()
    .from(candidateDocuments)
    .where(eq(candidateDocuments.id, id))
    .limit(1)
  return dokumen ?? null
}

export async function daftarPersetujuan(candidateId: string) {
  return db
    .select()
    .from(candidateConsents)
    .where(eq(candidateConsents.candidateId, candidateId))
    .orderBy(desc(candidateConsents.grantedAt))
}

/** Daftar kota yang sudah pernah dipakai, untuk isian bantu di penyaring. */
export async function daftarKota(): Promise<string[]> {
  const baris = await db
    .selectDistinct({ kota: candidates.domicileCity })
    .from(candidates)
    .where(and(isNull(candidates.deletedAt), sql`${candidates.domicileCity} is not null`))
    .orderBy(candidates.domicileCity)
  return baris.map((b) => b.kota).filter((k): k is string => Boolean(k))
}

export type KandidatSerupa = { id: string; nama: string; keterangan: string; alasan: string }

/**
 * Mencari kandidat yang mungkin orang yang sama — SPEC §5.6.
 *
 * Dua tingkat, dan bedanya penting:
 *
 *  · Nomor telepon atau email yang sama berarti **pasti** orang yang sama.
 *    Basis data pun menolaknya lewat indeks unik, jadi ini dilaporkan sebagai
 *    penghalang.
 *  · Nama yang mirip **belum tentu** orang yang sama — "Budi Santoso" itu
 *    banyak. Ini hanya ditampilkan sebagai peringatan; manusia yang memutuskan
 *    gabung atau buat baru.
 */
export async function cariKandidatSerupa(
  data: { fullName: string; phone: string | null; email: string | null },
  kecualiId?: string,
): Promise<{ pasti: KandidatSerupa[]; mungkin: KandidatSerupa[] }> {
  const pengecualian = kecualiId ? sql`and ${candidates.id} <> ${kecualiId}` : sql``

  const pasti: KandidatSerupa[] = []

  if (data.phone) {
    const telepon = normalisasiTelepon(data.phone)
    const baris = await db
      .select({ id: candidates.id, nama: candidates.fullName, telepon: candidates.phone })
      .from(candidates)
      .where(
        and(
          eq(candidates.phone, telepon),
          isNull(candidates.deletedAt),
          eq(candidates.isAnonymized, false),
          sql`true ${pengecualian}`,
        ),
      )
      .limit(5)
    for (const b of baris) {
      pasti.push({
        id: b.id,
        nama: b.nama,
        keterangan: b.telepon ?? '',
        alasan: 'Nomor telepon sama persis',
      })
    }
  }

  if (data.email) {
    const email = normalisasiEmail(data.email)
    const baris = await db
      .select({ id: candidates.id, nama: candidates.fullName, email: candidates.email })
      .from(candidates)
      .where(
        and(
          sql`lower(${candidates.email}) = ${email}`,
          isNull(candidates.deletedAt),
          eq(candidates.isAnonymized, false),
          sql`true ${pengecualian}`,
        ),
      )
      .limit(5)
    for (const b of baris) {
      if (pasti.some((p) => p.id === b.id)) continue
      pasti.push({ id: b.id, nama: b.nama, keterangan: b.email ?? '', alasan: 'Email sama persis' })
    }
  }

  // Kemiripan nama memakai pg_trgm — indeks `idx_candidates_name_trgm` sudah ada.
  const miripNama = await db
    .select({
      id: candidates.id,
      nama: candidates.fullName,
      perusahaan: candidates.currentCompany,
      telepon: candidates.phone,
      skor: sql<number>`similarity(${candidates.fullName}, ${data.fullName})`.mapWith(Number),
    })
    .from(candidates)
    .where(
      and(
        sql`similarity(${candidates.fullName}, ${data.fullName}) > 0.45`,
        isNull(candidates.deletedAt),
        eq(candidates.isAnonymized, false),
        sql`true ${pengecualian}`,
      ),
    )
    .orderBy(sql`similarity(${candidates.fullName}, ${data.fullName}) desc`)
    .limit(5)

  const mungkin: KandidatSerupa[] = miripNama
    .filter((b) => !pasti.some((p) => p.id === b.id))
    .map((b) => ({
      id: b.id,
      nama: b.nama,
      keterangan: [b.perusahaan, b.telepon].filter(Boolean).join(' · '),
      alasan: 'Nama mirip',
    }))

  return { pasti, mungkin }
}

/**
 * Membuat kandidat sekaligus catatan persetujuannya, dalam satu transaksi.
 *
 * Keduanya harus jadi atau keduanya batal. Kandidat tanpa catatan persetujuan
 * adalah data pribadi yang kita simpan tanpa dasar — persis keadaan yang
 * dilarang UU 27/2022 (SPEC §9.1).
 */
export async function buatKandidatDenganPersetujuan(
  data: DataKandidat,
  persetujuan: { method: 'form_daring' | 'whatsapp' | 'email' | 'kertas'; evidence: string },
  ownerUserId: string,
  ipAddress: string | null,
): Promise<string> {
  const [pengaturan] = await db
    .select({ bulan: companySettings.defaultRetentionMonths })
    .from(companySettings)
    .where(eq(companySettings.id, 1))
    .limit(1)

  const bulanRetensi = pengaturan?.bulan ?? 24
  const retentionUntil = hitungRetentionUntil(tanggalHariIniJakarta(), bulanRetensi)

  return db.transaction(async (trx) => {
    const [kandidat] = await trx
      .insert(candidates)
      .values({ ...data, ownerUserId })
      .returning({ id: candidates.id })

    await trx.insert(candidateConsents).values({
      candidateId: kandidat!.id,
      purpose: TUJUAN_PEMROSESAN,
      noticeVersion: VERSI_PEMBERITAHUAN_BERLAKU,
      method: persetujuan.method,
      evidence: persetujuan.evidence,
      ipAddress,
      retentionUntil,
    })

    return kandidat!.id
  })
}

export async function ubahKandidat(id: string, data: DataKandidat) {
  await db
    .update(candidates)
    .set({ ...data, updatedAt: new Date(), lastActivityAt: new Date() })
    .where(eq(candidates.id, id))
}

export async function catatDokumen(nilai: {
  candidateId: string
  fileKey: string
  fileName: string
  mimeType: string
  sizeBytes: bigint
  uploadedBy: string
}) {
  return db.transaction(async (trx) => {
    // Hanya satu CV yang berlaku sebagai versi terkini; yang lama tetap
    // disimpan karena `submissions.document_id` menunjuk ke versi yang benar-
    // benar dikirim ke klien.
    await trx
      .update(candidateDocuments)
      .set({ isCurrent: false })
      .where(
        and(
          eq(candidateDocuments.candidateId, nilai.candidateId),
          eq(candidateDocuments.type, 'cv'),
        ),
      )

    const [dokumen] = await trx
      .insert(candidateDocuments)
      .values({ ...nilai, type: 'cv', isCurrent: true })
      .returning({ id: candidateDocuments.id })

    await trx
      .update(candidates)
      .set({ lastActivityAt: new Date() })
      .where(eq(candidates.id, nilai.candidateId))

    return dokumen!.id
  })
}

/**
 * Berapa kandidat yang ada sama sekali.
 *
 * Dipakai untuk membedakan dua keadaan kosong yang butuh saran berbeda:
 * "belum ada kandidat di basis data" dan "semua kandidat sudah dikaitkan ke
 * lowongan ini".
 */
export async function jumlahKandidat(): Promise<number> {
  const [baris] = await db
    .select({ n: count() })
    .from(candidates)
    .where(isNull(candidates.deletedAt))
  return baris?.n ?? 0
}
