import { and, asc, count, desc, eq, ilike, inArray, isNull, isNotNull, ne, or, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  candidateDocuments,
  candidates,
  clientAgreements,
  clients,
  jobs,
  submissionEvents,
  submissions,
  users,
  type TahapPengajuan,
} from '@/lib/db/schema'
import { periksaPerpindahan } from '@/lib/rules/tahapan'
import { cekMasaProteksi, type HasilProteksi } from '@/lib/rules/proteksi'
import { tanggalHariIniJakarta, tanggalJakarta } from '@/lib/format'
import type { DataPindahTahap } from '@/lib/validation/pengajuan'

/**
 * Pipeline — SPEC §6.1.
 *
 * Satu hal yang menentukan seluruh berkas ini: **setiap perpindahan tahap
 * menulis satu baris `submission_events`, dalam transaksi yang sama dengan
 * perubahan `submissions.stage`.** Kalau keduanya bisa terpisah, suatu saat akan
 * ada pengajuan yang tahapnya berubah tanpa jejak — dan seluruh metrik di SPEC
 * §12 dihitung dari tabel jejak itu, bukan dari kolom `stage`. Metrik yang
 * dihitung dari data bolong tidak salah sedikit; ia salah diam-diam.
 */

export type Aktor = { id: string; peran: 'owner' | 'recruiter' }

// ------------------------------------------------------------ pembuatan

/**
 * Mengaitkan kandidat ke lowongan pada tahap `sourced`.
 *
 * Baris `submission_events` pertama ikut ditulis di sini. Tanpa itu, pengajuan
 * yang tidak pernah pindah tahap tidak punya satu pun catatan waktu, dan
 * "berapa lama dari dikaitkan sampai diajukan" jadi tidak bisa dihitung untuk
 * pengajuan yang paling perlu diperiksa.
 */
export async function buatPengajuan(
  data: { jobId: string; candidateId: string; notes: string | null },
  aktor: Aktor,
): Promise<{ id: string; nama: string }> {
  return db.transaction(async (tx) => {
    const [baris] = await tx
      .insert(submissions)
      .values({
        jobId: data.jobId,
        candidateId: data.candidateId,
        notes: data.notes,
        stage: 'sourced',
      })
      .returning({ id: submissions.id })

    const id = baris!.id

    await tx.insert(submissionEvents).values({
      submissionId: id,
      fromStage: null,
      toStage: 'sourced',
      actorUserId: aktor.id,
      note: data.notes,
    })

    // Kandidat yang sedang diproses tidak boleh ikut terhapus oleh aturan
    // retensi 24 bulan (SPEC §9.3). Mengaitkannya ke lowongan adalah aktivitas.
    const [kandidat] = await tx
      .update(candidates)
      .set({ lastActivityAt: new Date(), updatedAt: new Date() })
      .where(eq(candidates.id, data.candidateId))
      .returning({ nama: candidates.fullName })

    return { id, nama: kandidat?.nama ?? 'Kandidat' }
  })
}

// --------------------------------------------------------- pindah tahap

export type HasilPindahTahap =
  | { jadi: true }
  | { jadi: false; pesan: string; medan?: string }

/**
 * Memindahkan satu pengajuan ke tahap lain.
 *
 * Yang dijaga di sini, berurutan sesuai bahayanya:
 *
 * 1. `submitted_at` hanya ditulis SEKALI, saat tahap pertama kali mencapai
 *    `submitted_to_client`. Ia tidak pernah ditimpa — basis data pun menolaknya
 *    lewat trigger `trg_guard_submitted_at`. Stempel waktu inilah dasar klaim
 *    fee bila klien merekrut kandidat lewat jalur lain (SPEC §5.5).
 * 2. Jejak perpindahan ditulis dalam transaksi yang sama.
 * 3. Aturan urutan tahap diperiksa lebih dulu, dan alasan wajib untuk lompatan.
 */
export async function pindahTahap(
  data: DataPindahTahap,
  aktor: Aktor,
): Promise<HasilPindahTahap> {
  return db.transaction(async (tx) => {
    const [sekarang] = await tx
      .select({
        id: submissions.id,
        stage: submissions.stage,
        submittedAt: submissions.submittedAt,
        candidateId: submissions.candidateId,
      })
      .from(submissions)
      .where(eq(submissions.id, data.submissionId))
      .limit(1)

    if (!sekarang) return { jadi: false, pesan: 'Pengajuan tidak ditemukan.' }

    const izin = periksaPerpindahan(sekarang.stage, data.ke, aktor.peran)
    if (!izin.boleh) return { jadi: false, pesan: izin.alasan }

    const catatan = data.catatan?.trim() ?? ''
    if (izin.perluCatatan && catatan === '') {
      return {
        jadi: false,
        medan: 'catatan',
        pesan:
          'Perpindahan ini melewati urutan biasa, jadi alasannya wajib ditulis. ' +
          'Setahun lagi, catatan inilah satu-satunya yang menjelaskan kenapa.',
      }
    }

    const sekarangWaktu = new Date()
    const perubahan: Record<string, unknown> = {
      stage: data.ke,
      stageUpdatedAt: sekarangWaktu,
    }

    // Stempel waktu bernilai hukum — hanya ditulis bila masih kosong.
    if (data.ke === 'submitted_to_client' && sekarang.submittedAt === null) {
      perubahan.submittedAt = sekarangWaktu
      perubahan.submittedBy = aktor.id
    }

    // CV versi mana yang dikirim ke klien. Bagian dari berkas bukti (SPEC §5.5).
    if (data.documentId !== null) perubahan.documentId = data.documentId

    if (data.ke === 'rejected') {
      perubahan.rejectedBy = data.rejectedBy
      perubahan.rejectionReason = data.rejectionReason
    }

    if (data.ke === 'withdrawn') {
      perubahan.withdrawnAt = sekarangWaktu
    } else if (sekarang.stage === 'withdrawn') {
      /**
       * Dibuka kembali setelah kandidat sempat mundur.
       *
       * `withdrawn_at` dikosongkan bukan untuk menghapus jejak — perpindahannya
       * tetap tercatat di `submission_events`, dan itulah catatan yang
       * sebenarnya. Yang dikosongkan cuma penanda "sedang mundur"; kalau
       * dibiarkan terisi, pengajuan yang sudah berjalan lagi tidak akan pernah
       * terhitung sebagai pengajuan aktif di dasbor.
       */
      perubahan.withdrawnAt = null
    }

    await tx.update(submissions).set(perubahan).where(eq(submissions.id, data.submissionId))

    await tx.insert(submissionEvents).values({
      submissionId: data.submissionId,
      fromStage: sekarang.stage,
      toStage: data.ke,
      occurredAt: sekarangWaktu,
      actorUserId: aktor.id,
      note: catatan === '' ? null : catatan,
    })

    await tx
      .update(candidates)
      .set({ lastActivityAt: sekarangWaktu, updatedAt: sekarangWaktu })
      .where(eq(candidates.id, sekarang.candidateId))

    return { jadi: true }
  })
}

// ------------------------------------------------------------ pembacaan

export type BarisPengajuan = {
  id: string
  stage: TahapPengajuan
  stageUpdatedAt: Date
  submittedAt: Date | null
  withdrawnAt: Date | null
  candidateId: string
  candidateName: string
  candidateTitle: string | null
  candidateCity: string | null
  expectedSalary: bigint | null
  jobId: string
  jobTitle: string
  clientId: string
  clientName: string
}

const KOLOM_BARIS = {
  id: submissions.id,
  stage: submissions.stage,
  stageUpdatedAt: submissions.stageUpdatedAt,
  submittedAt: submissions.submittedAt,
  withdrawnAt: submissions.withdrawnAt,
  candidateId: candidates.id,
  candidateName: candidates.fullName,
  candidateTitle: candidates.currentTitle,
  candidateCity: candidates.domicileCity,
  expectedSalary: candidates.expectedSalary,
  jobId: jobs.id,
  jobTitle: jobs.title,
  clientId: clients.id,
  clientName: clients.name,
}

/** Seluruh pengajuan pada satu lowongan, termasuk yang sudah ditutup. */
export async function daftarPengajuanLowongan(jobId: string): Promise<BarisPengajuan[]> {
  return db
    .select(KOLOM_BARIS)
    .from(submissions)
    .innerJoin(candidates, eq(candidates.id, submissions.candidateId))
    .innerJoin(jobs, eq(jobs.id, submissions.jobId))
    .innerJoin(clients, eq(clients.id, jobs.clientId))
    .where(eq(submissions.jobId, jobId))
    .orderBy(desc(submissions.stageUpdatedAt))
}

/** Seluruh pengajuan seorang kandidat, di lowongan mana pun. */
export async function daftarPengajuanKandidat(candidateId: string): Promise<BarisPengajuan[]> {
  return db
    .select(KOLOM_BARIS)
    .from(submissions)
    .innerJoin(candidates, eq(candidates.id, submissions.candidateId))
    .innerJoin(jobs, eq(jobs.id, submissions.jobId))
    .innerJoin(clients, eq(clients.id, jobs.clientId))
    .where(eq(submissions.candidateId, candidateId))
    .orderBy(desc(submissions.stageUpdatedAt))
}

/** Papan pipeline: seluruh pengajuan yang masih berjalan, untuk dikelompokkan per tahap. */
export async function papanPipeline(
  filter: { cari?: string; lowongan?: string; klien?: string } = {},
): Promise<BarisPengajuan[]> {
  const syarat = [isNull(jobs.deletedAt)]
  if (filter.lowongan) syarat.push(eq(submissions.jobId, filter.lowongan))
  if (filter.klien) syarat.push(eq(jobs.clientId, filter.klien))
  if (filter.cari) {
    const pola = `%${filter.cari}%`
    syarat.push(or(ilike(candidates.fullName, pola), ilike(jobs.title, pola))!)
  }

  return db
    .select(KOLOM_BARIS)
    .from(submissions)
    .innerJoin(candidates, eq(candidates.id, submissions.candidateId))
    .innerJoin(jobs, eq(jobs.id, submissions.jobId))
    .innerJoin(clients, eq(clients.id, jobs.clientId))
    .where(and(...syarat))
    .orderBy(desc(submissions.stageUpdatedAt))
    .limit(500)
}

export async function ambilPengajuan(id: string) {
  const [baris] = await db
    .select({
      pengajuan: submissions,
      kandidat: {
        id: candidates.id,
        fullName: candidates.fullName,
        phone: candidates.phone,
        email: candidates.email,
        currentTitle: candidates.currentTitle,
        currentCompany: candidates.currentCompany,
        domicileCity: candidates.domicileCity,
        yearsExperience: candidates.yearsExperience,
        expectedSalary: candidates.expectedSalary,
        status: candidates.status,
      },
      lowongan: {
        id: jobs.id,
        title: jobs.title,
        status: jobs.status,
        location: jobs.location,
        salaryMin: jobs.salaryMin,
        salaryMax: jobs.salaryMax,
        agreementId: jobs.agreementId,
      },
      klien: { id: clients.id, name: clients.name, picName: clients.picName },
    })
    .from(submissions)
    .innerJoin(candidates, eq(candidates.id, submissions.candidateId))
    .innerJoin(jobs, eq(jobs.id, submissions.jobId))
    .innerJoin(clients, eq(clients.id, jobs.clientId))
    .where(eq(submissions.id, id))
    .limit(1)
  return baris ?? null
}

/** Riwayat perpindahan satu pengajuan — inti dari Fase 2. */
export async function riwayatPengajuan(submissionId: string) {
  return db
    .select({
      id: submissionEvents.id,
      fromStage: submissionEvents.fromStage,
      toStage: submissionEvents.toStage,
      occurredAt: submissionEvents.occurredAt,
      note: submissionEvents.note,
      actorIsClient: submissionEvents.actorIsClient,
      actorName: users.fullName,
    })
    .from(submissionEvents)
    .leftJoin(users, eq(users.id, submissionEvents.actorUserId))
    .where(eq(submissionEvents.submissionId, submissionId))
    .orderBy(asc(submissionEvents.occurredAt), asc(submissionEvents.id))
}

/** CV kandidat, untuk memilih versi mana yang dikirim ke klien. */
export async function daftarCvKandidat(candidateId: string) {
  return db
    .select({
      id: candidateDocuments.id,
      fileName: candidateDocuments.fileName,
      uploadedAt: candidateDocuments.uploadedAt,
    })
    .from(candidateDocuments)
    .where(and(eq(candidateDocuments.candidateId, candidateId), eq(candidateDocuments.type, 'cv')))
    .orderBy(desc(candidateDocuments.uploadedAt))
}

/**
 * Kandidat yang belum dikaitkan ke lowongan ini.
 *
 * SPEC §5.6 melarang satu kandidat diajukan dua kali ke lowongan yang sama, dan
 * basis data menegakkannya lewat `uq_submission`. Menyaringnya di sini bukan
 * pengganti penjagaan itu — hanya supaya perekrut tidak memilih nama yang pasti
 * ditolak.
 */
export async function kandidatBelumDiajukan(jobId: string, cari?: string) {
  /**
   * Tanpa kata pencarian, daftar ini sengaja pendek.
   *
   * Basis data ini akan berisi lebih dari seribu kandidat dalam setahun.
   * Menuangkan semuanya ke halaman lowongan membuat halamannya panjang tanpa
   * menolong siapa pun — perekrut yang tahu siapa yang dicarinya akan mengetik
   * namanya, dan yang tidak tahu lebih terbantu oleh beberapa nama terbaru
   * daripada oleh lima puluh.
   */
  const batas = cari ? 50 : 8

  const sudah = db
    .select({ id: submissions.candidateId })
    .from(submissions)
    .where(eq(submissions.jobId, jobId))

  const syarat = [isNull(candidates.deletedAt), ne(candidates.status, 'blacklist')]
  if (cari) {
    const pola = `%${cari}%`
    syarat.push(
      or(
        ilike(candidates.fullName, pola),
        ilike(candidates.currentTitle, pola),
        ilike(candidates.currentCompany, pola),
        ilike(candidates.domicileCity, pola),
      )!,
    )
  }
  syarat.push(sql`${candidates.id} NOT IN ${sudah}`)

  return db
    .select({
      id: candidates.id,
      fullName: candidates.fullName,
      currentTitle: candidates.currentTitle,
      currentCompany: candidates.currentCompany,
      domicileCity: candidates.domicileCity,
      yearsExperience: candidates.yearsExperience,
      expectedSalary: candidates.expectedSalary,
      skills: candidates.skills,
    })
    .from(candidates)
    .where(and(...syarat))
    .orderBy(desc(candidates.lastActivityAt))
    .limit(batas)
}

// ----------------------------------------------------------- proteksi

export type PeringatanProteksi = HasilProteksi & {
  clientName: string
  /** Lowongan tempat kandidat pertama kali diajukan ke klien ini. */
  jobTitle: string
  pertamaDiajukan: string
}

/**
 * Apakah kandidat ini sedang dalam masa proteksi terhadap klien tersebut —
 * SPEC §5.5 poin 4.
 *
 * Dipakai untuk MEMPERINGATKAN, bukan memblokir. Yang perlu diketahui perekrut:
 * kalau kandidat ini sudah pernah diajukan ke klien yang sama, klaim fee-nya
 * berjalan sejak pengajuan PERTAMA (SPEC §5.6), bukan sejak yang sekarang.
 *
 * Perhitungannya memakai `cekMasaProteksi()` — fungsi murni yang diuji terpisah
 * — bukan kolom `is_protected` di view `candidate_protection`. View itu tetap
 * ada dan dipakai uji aturan SQL serta ekspor bukti di Fase 3; menyalin
 * aturannya ke satu fungsi TypeScript membuat peringatan di layar bisa diuji
 * tanpa basis data.
 */
export async function cekProteksiKandidat(
  candidateId: string,
  clientId: string,
): Promise<PeringatanProteksi | null> {
  const [pertama] = await db
    .select({
      submittedAt: submissions.submittedAt,
      jobTitle: jobs.title,
      clientName: clients.name,
      protectionMonths: clientAgreements.protectionMonths,
    })
    .from(submissions)
    .innerJoin(jobs, eq(jobs.id, submissions.jobId))
    .innerJoin(clients, eq(clients.id, jobs.clientId))
    .leftJoin(clientAgreements, eq(clientAgreements.id, jobs.agreementId))
    .where(
      and(
        eq(submissions.candidateId, candidateId),
        eq(jobs.clientId, clientId),
        isNotNull(submissions.submittedAt),
      ),
    )
    .orderBy(asc(submissions.submittedAt))
    .limit(1)

  if (!pertama?.submittedAt) return null

  const pertamaDiajukan = tanggalJakarta(pertama.submittedAt)
  const hasil = cekMasaProteksi(
    pertamaDiajukan,
    pertama.protectionMonths ?? 12,
    tanggalHariIniJakarta(),
  )

  return {
    ...hasil,
    pertamaDiajukan,
    jobTitle: pertama.jobTitle,
    clientName: pertama.clientName,
  }
}

/**
 * Seluruh kandidat yang sedang dalam masa proteksi terhadap satu klien.
 *
 * Dipakai untuk menandai nama-nama di daftar pilihan kandidat sebelum perekrut
 * mengaitkannya — lebih berguna daripada peringatan yang baru muncul setelah
 * tersimpan.
 *
 * SQL mentah dipakai di sini karena `DISTINCT ON` tidak punya padanan langsung
 * di Drizzle. Ia tetap tinggal di lapisan query, tidak bocor ke komponen
 * (CLAUDE.md "Konvensi kode").
 */
export async function proteksiKlien(clientId: string): Promise<Map<string, PeringatanProteksi>> {
  const hasil = await db.execute<{
    candidate_id: string
    submitted_at: Date
    job_title: string
    client_name: string
    protection_months: number | null
  }>(sql`
    SELECT DISTINCT ON (s.candidate_id)
           s.candidate_id,
           s.submitted_at,
           j.title        AS job_title,
           c.name         AS client_name,
           ca.protection_months
      FROM submissions s
      JOIN jobs    j ON j.id = s.job_id
      JOIN clients c ON c.id = j.client_id
      LEFT JOIN client_agreements ca ON ca.id = j.agreement_id
     WHERE j.client_id = ${clientId}
       AND s.submitted_at IS NOT NULL
     ORDER BY s.candidate_id, s.submitted_at ASC
  `)

  const hariIni = tanggalHariIniJakarta()
  const peta = new Map<string, PeringatanProteksi>()

  for (const baris of hasil.rows) {
    const pertamaDiajukan = tanggalJakarta(new Date(baris.submitted_at))
    peta.set(baris.candidate_id, {
      ...cekMasaProteksi(pertamaDiajukan, baris.protection_months ?? 12, hariIni),
      pertamaDiajukan,
      jobTitle: baris.job_title,
      clientName: baris.client_name,
    })
  }

  return peta
}

// ------------------------------------------------------------- ringkasan

/** Jumlah pengajuan per tahap pada satu lowongan. Dipakai di halaman lowongan. */
export async function ringkasanTahapLowongan(jobId: string) {
  const baris = await db
    .select({ stage: submissions.stage, jumlah: count() })
    .from(submissions)
    .where(eq(submissions.jobId, jobId))
    .groupBy(submissions.stage)

  const hasil = new Map<TahapPengajuan, number>()
  for (const b of baris) hasil.set(b.stage, b.jumlah)
  return hasil
}

/** Lowongan yang masih menerima kandidat, untuk kotak pilihan. */
export async function lowonganUntukPilihan() {
  return db
    .select({
      id: jobs.id,
      title: jobs.title,
      status: jobs.status,
      clientId: clients.id,
      clientName: clients.name,
    })
    .from(jobs)
    .innerJoin(clients, eq(clients.id, jobs.clientId))
    .where(and(isNull(jobs.deletedAt), inArray(jobs.status, ['draft', 'open', 'on_hold'])))
    .orderBy(asc(clients.name), asc(jobs.title))
}
