/**
 * Cerminan TypeScript dari `docs/schema.sql`.
 *
 * Skema di `docs/schema.sql` sudah final dan sudah diuji di Postgres 16
 * (CLAUDE.md "Sebelum mulai"). Berkas ini TIDAK merancang ulang skema itu — ia
 * hanya memberi tipe supaya query Drizzle bisa diperiksa compiler. Bila skema
 * berubah, `docs/schema.sql` yang diubah lebih dulu, lalu berkas ini menyusul.
 *
 * Konvensi yang ditegakkan di sini:
 *   · Uang       : bigint mode 'bigint' — supaya TypeScript menolak aritmetika
 *                  `number` pada nilai rupiah (CLAUDE.md "Uang").
 *   · Persentase : numeric(5,4) dibaca sebagai string — tidak pernah float.
 *   · Waktu      : timestamptz dibaca sebagai Date.
 *   · Tanggal    : date dibaca sebagai string 'YYYY-MM-DD' — tanpa jam, tanpa
 *                  zona waktu, supaya tanggal bisnis tidak bergeser sehari
 *                  (CLAUDE.md "Waktu").
 */
import { sql } from 'drizzle-orm'
import {
  bigint,
  bigserial,
  boolean,
  check,
  date,
  index,
  inet,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  pgView,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

// ------------------------------------------------------------------ enum

export const userRole = pgEnum('user_role', ['owner', 'recruiter'])
export const clientStatus = pgEnum('client_status', ['prospect', 'active', 'dormant', 'blacklist'])
export const jobStatus = pgEnum('job_status', ['draft', 'open', 'on_hold', 'filled', 'cancelled', 'lost'])
export const candidateStatus = pgEnum('candidate_status', ['active', 'placed', 'withdrawn', 'blacklist'])
export const candidateSource = pgEnum('candidate_source', [
  'referral',
  'job_portal',
  'linkedin',
  'walk_in',
  'database',
  'other',
])
export const documentType = pgEnum('document_type', ['cv', 'ijazah', 'sertifikat', 'portfolio', 'other'])
export const consentMethod = pgEnum('consent_method', ['form_daring', 'whatsapp', 'email', 'kertas'])
export const placementStatus = pgEnum('placement_status', ['active', 'guarantee_passed', 'failed', 'replaced'])
export const invoiceMilestone = pgEnum('invoice_milestone', ['first', 'second'])
export const invoiceStatus = pgEnum('invoice_status', ['draft', 'sent', 'paid', 'overdue', 'void'])
export const activityType = pgEnum('activity_type', [
  'call',
  'whatsapp',
  'email',
  'meeting',
  'note',
  'portal_feedback',
])
export const rejectedByEnum = pgEnum('rejected_by', ['us', 'client'])

/** Tahapan pipeline. Urutan penting — SPEC.md §6.1 */
export const submissionStage = pgEnum('submission_stage', [
  'sourced',
  'screened',
  'interviewed_internal',
  'submitted_to_client',
  'client_interview',
  'offer',
  'signed',
  'started',
  'guarantee_passed',
  'rejected',
  'withdrawn',
])

// ------------------------------------------- pengaturan perusahaan (1 baris)

export const companySettings = pgTable(
  'company_settings',
  {
    id: smallint('id').primaryKey().default(1),
    legalName: text('legal_name').notNull(),
    nib: text('nib'),
    npwp: text('npwp'),
    address: text('address'),
    phone: text('phone'),
    email: text('email'),
    bankName: text('bank_name'),
    bankAccountNo: text('bank_account_no'),
    bankAccountName: text('bank_account_name'),
    /** SPEC §5.3 — default false. PPN baru muncul setelah perusahaan jadi PKP. */
    isPkp: boolean('is_pkp').notNull().default(false),
    ppnRate: numeric('ppn_rate', { precision: 5, scale: 4 }).notNull().default('0.1100'),
    pph23Rate: numeric('pph23_rate', { precision: 5, scale: 4 }).notNull().default('0.0200'),
    defaultFeePercent: numeric('default_fee_percent', { precision: 5, scale: 4 }).notNull().default('0.1500'),
    defaultGuaranteeDays: integer('default_guarantee_days').notNull().default(90),
    defaultPaymentTermsDays: integer('default_payment_terms_days').notNull().default(7),
    defaultProtectionMonths: integer('default_protection_months').notNull().default(12),
    defaultRetentionMonths: integer('default_retention_months').notNull().default(24),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [check('company_settings_id_check', sql`${t.id} = 1`)],
)

// ------------------------------------------------------------- pengguna

export const users = pgTable('users', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  fullName: text('full_name').notNull(),
  phone: text('phone'),
  role: userRole('role').notNull().default('recruiter'),
  isActive: boolean('is_active').notNull().default(true),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true, mode: 'date' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
})

// ---------------------------------------------------------------- klien

export const clients = pgTable(
  'clients',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    name: text('name').notNull(),
    industry: text('industry'),
    address: text('address'),
    npwp: text('npwp'),
    picName: text('pic_name'),
    picTitle: text('pic_title'),
    picPhone: text('pic_phone'),
    picEmail: text('pic_email'),
    status: clientStatus('status').notNull().default('prospect'),
    notes: text('notes'),
    ownerUserId: uuid('owner_user_id').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
  },
  (t) => [
    index('idx_clients_status').on(t.status).where(sql`${t.deletedAt} IS NULL`),
    index('idx_clients_name_trgm').using('gin', sql`${t.name} gin_trgm_ops`),
  ],
)

/** Ketentuan komersial hidup di sini, bukan di `clients`. */
export const clientAgreements = pgTable(
  'client_agreements',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'restrict' }),
    agreementNumber: text('agreement_number'),
    signedDate: date('signed_date', { mode: 'string' }),
    startDate: date('start_date', { mode: 'string' }),
    endDate: date('end_date', { mode: 'string' }),
    feePercent: numeric('fee_percent', { precision: 5, scale: 4 }).notNull(),
    splitFirstPercent: numeric('split_first_percent', { precision: 5, scale: 4 }).notNull().default('0.5000'),
    guaranteeDays: integer('guarantee_days').notNull().default(90),
    paymentTermsDays: integer('payment_terms_days').notNull().default(7),
    /** SPEC §5.5, Pasal 4 perjanjian */
    protectionMonths: integer('protection_months').notNull().default(12),
    fileKey: text('file_key'),
    isActive: boolean('is_active').notNull().default(true),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_agreements_client').on(t.clientId).where(sql`${t.isActive}`),
    // SPEC §5.1: tolak fee di luar rentang wajar
    check('chk_fee_range', sql`${t.feePercent} BETWEEN 0.10 AND 0.30`),
    check('chk_split_range', sql`${t.splitFirstPercent} BETWEEN 0 AND 1`),
    check(
      'chk_dates',
      sql`${t.endDate} IS NULL OR ${t.startDate} IS NULL OR ${t.endDate} >= ${t.startDate}`,
    ),
  ],
)

// ------------------------------------------------------------- lowongan

export const jobs = pgTable(
  'jobs',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'restrict' }),
    agreementId: uuid('agreement_id').references(() => clientAgreements.id),
    title: text('title').notNull(),
    headcount: integer('headcount').notNull().default(1),
    location: text('location'),
    employmentType: text('employment_type'),
    salaryMin: bigint('salary_min', { mode: 'bigint' }),
    salaryMax: bigint('salary_max', { mode: 'bigint' }),
    mustHave: text('must_have').array().notNull().default(sql`'{}'`),
    niceToHave: text('nice_to_have').array().notNull().default(sql`'{}'`),
    /** SPEC §6.3 — field paling bernilai. Wajib saat status pindah ke 'open'. */
    reasonPreviousFailed: text('reason_previous_failed'),
    decisionMaker: text('decision_maker'),
    interviewer: text('interviewer'),
    vacancyAgeNote: text('vacancy_age_note'),
    targetStartDate: date('target_start_date', { mode: 'string' }),
    /** Hasil AI §7.3, sudah disunting manusia. */
    screeningQuestions: text('screening_questions').array().notNull().default(sql`'{}'`),
    status: jobStatus('status').notNull().default('draft'),
    ownerUserId: uuid('owner_user_id').references(() => users.id),
    openedAt: timestamp('opened_at', { withTimezone: true, mode: 'date' }),
    closedAt: timestamp('closed_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),

    /**
     * Enam isian formulir kebutuhan klien yang normatif di praktik HR, tapi
     * belum ada di skema versi 1.0. Ditambahkan 26 Agustus 2026 lewat migrasi
     * `0001_lowongan_formulir_normatif`.
     *
     * Yang sengaja tidak ada: preferensi jenis kelamin dan batas usia.
     */
    mainDuties: text('main_duties').array().notNull().default(sql`'{}'`),
    department: text('department'),
    reportsTo: text('reports_to'),
    workArrangement: text('work_arrangement'),
    benefits: text('benefits').array().notNull().default(sql`'{}'`),
    clientInterviewStages: text('client_interview_stages').array().notNull().default(sql`'{}'`),
  },
  (t) => [
    index('idx_jobs_client').on(t.clientId).where(sql`${t.deletedAt} IS NULL`),
    index('idx_jobs_status').on(t.status).where(sql`${t.deletedAt} IS NULL`),
    check('jobs_headcount_check', sql`${t.headcount} > 0`),
    check('jobs_salary_min_check', sql`${t.salaryMin} >= 0`),
    check('jobs_salary_max_check', sql`${t.salaryMax} >= 0`),
    check(
      'chk_salary_range',
      sql`${t.salaryMax} IS NULL OR ${t.salaryMin} IS NULL OR ${t.salaryMax} >= ${t.salaryMin}`,
    ),
    check(
      'chk_reason_required_when_open',
      sql`${t.status} <> 'open' OR (${t.reasonPreviousFailed} IS NOT NULL AND length(btrim(${t.reasonPreviousFailed})) > 0)`,
    ),
  ],
)

// ------------------------------------------------------------- kandidat
// Catatan PDP (SPEC §9.5): tidak ada kolom NIK, foto, agama, status kawin,
// atau nomor rekening. Data yang tidak disimpan tidak bisa bocor.

export const candidates = pgTable(
  'candidates',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    fullName: text('full_name').notNull(),
    phone: text('phone'),
    email: text('email'),
    domicileCity: text('domicile_city'),
    currentCompany: text('current_company'),
    currentTitle: text('current_title'),
    yearsExperience: numeric('years_experience', { precision: 4, scale: 1 }),
    education: text('education'),
    skills: text('skills').array().notNull().default(sql`'{}'`),
    /** TIDAK PERNAH tampil ke client_viewer — SPEC §5.7, §8. */
    currentSalary: bigint('current_salary', { mode: 'bigint' }),
    expectedSalary: bigint('expected_salary', { mode: 'bigint' }),
    noticePeriodDays: integer('notice_period_days'),
    source: candidateSource('source').notNull().default('other'),
    sourceDetail: text('source_detail'),
    status: candidateStatus('status').notNull().default('active'),
    ownerUserId: uuid('owner_user_id').references(() => users.id),
    notes: text('notes'),
    /** SPEC §9.2 hak penghapusan */
    isAnonymized: boolean('is_anonymized').notNull().default(false),
    anonymizedAt: timestamp('anonymized_at', { withTimezone: true, mode: 'date' }),
    /** Dasar hitung retensi 24 bulan. */
    lastActivityAt: timestamp('last_activity_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
  },
  (t) => [
    index('idx_candidates_name_trgm').using('gin', sql`${t.fullName} gin_trgm_ops`),
    index('idx_candidates_skills').using('gin', t.skills),
    index('idx_candidates_status').on(t.status).where(sql`${t.deletedAt} IS NULL`),
    index('idx_candidates_activity').on(t.lastActivityAt),
    // Deteksi duplikat (SPEC §5.6) — parsial supaya NULL tidak bentrok.
    uniqueIndex('uq_candidates_phone')
      .on(t.phone)
      .where(sql`${t.phone} IS NOT NULL AND ${t.deletedAt} IS NULL AND ${t.isAnonymized} = FALSE`),
    uniqueIndex('uq_candidates_email')
      .on(sql`lower(${t.email})`)
      .where(sql`${t.email} IS NOT NULL AND ${t.deletedAt} IS NULL AND ${t.isAnonymized} = FALSE`),
    check('candidates_years_experience_check', sql`${t.yearsExperience} >= 0`),
    check('candidates_current_salary_check', sql`${t.currentSalary} >= 0`),
    check('candidates_expected_salary_check', sql`${t.expectedSalary} >= 0`),
    check('candidates_notice_period_days_check', sql`${t.noticePeriodDays} >= 0`),
  ],
)

export const candidateDocuments = pgTable(
  'candidate_documents',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    candidateId: uuid('candidate_id')
      .notNull()
      .references(() => candidates.id, { onDelete: 'cascade' }),
    type: documentType('type').notNull().default('cv'),
    /** Kunci Vercel Blob. Berkas tidak pernah disimpan di basis data. */
    fileKey: text('file_key').notNull(),
    fileName: text('file_name').notNull(),
    mimeType: text('mime_type'),
    sizeBytes: bigint('size_bytes', { mode: 'bigint' }),
    isCurrent: boolean('is_current').notNull().default(true),
    uploadedBy: uuid('uploaded_by').references(() => users.id),
    uploadedAt: timestamp('uploaded_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [index('idx_docs_candidate').on(t.candidateId)],
)

/** Hasil ekstraksi AI — SPEC §7.1. Terpisah dari `candidates` dengan sengaja. */
export const cvExtractions = pgTable(
  'cv_extractions',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    documentId: uuid('document_id')
      .notNull()
      .references(() => candidateDocuments.id, { onDelete: 'cascade' }),
    model: text('model').notNull(),
    rawJson: jsonb('raw_json').notNull(),
    /** Supaya biaya AI terlihat, bukan kejutan di akhir bulan. */
    costIdr: bigint('cost_idr', { mode: 'bigint' }).notNull().default(0n),
    latencyMs: integer('latency_ms'),
    errorMessage: text('error_message'),
    extractedAt: timestamp('extracted_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    /** NULL = belum dikonfirmasi manusia. */
    confirmedBy: uuid('confirmed_by').references(() => users.id),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true, mode: 'date' }),
  },
  (t) => [
    index('idx_extractions_doc').on(t.documentId),
    index('idx_extractions_unconfirmed').on(t.extractedAt).where(sql`${t.confirmedAt} IS NULL`),
  ],
)

/** Persetujuan pemrosesan data — SPEC §9.1. Wajib UU 27/2022. */
export const candidateConsents = pgTable(
  'candidate_consents',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    candidateId: uuid('candidate_id')
      .notNull()
      .references(() => candidates.id, { onDelete: 'cascade' }),
    purpose: text('purpose').notNull(),
    /** Versi teks pemberitahuan yang disetujui. */
    noticeVersion: text('notice_version').notNull(),
    method: consentMethod('method').notNull(),
    evidence: text('evidence'),
    ipAddress: inet('ip_address'),
    grantedAt: timestamp('granted_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    retentionUntil: date('retention_until', { mode: 'string' }).notNull(),
    withdrawnAt: timestamp('withdrawn_at', { withTimezone: true, mode: 'date' }),
    withdrawalNote: text('withdrawal_note'),
  },
  (t) => [
    index('idx_consents_candidate').on(t.candidateId),
    index('idx_consents_active').on(t.candidateId).where(sql`${t.withdrawnAt} IS NULL`),
  ],
)

// ------------------------------------------------- pengajuan (tabel bukti)
// SPEC §5.5 dan §5.7: submitted_at tidak pernah diubah (dijaga trigger basis
// data), baris tidak pernah dihapus keras.

export const submissions = pgTable(
  'submissions',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    jobId: uuid('job_id')
      .notNull()
      .references(() => jobs.id, { onDelete: 'restrict' }),
    candidateId: uuid('candidate_id')
      .notNull()
      .references(() => candidates.id, { onDelete: 'restrict' }),
    /** CV versi mana yang dikirim ke klien — bagian dari berkas bukti. */
    documentId: uuid('document_id').references(() => candidateDocuments.id),
    stage: submissionStage('stage').notNull().default('sourced'),
    stageUpdatedAt: timestamp('stage_updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    /**
     * Stempel waktu bernilai hukum. Diisi saat stage pertama kali mencapai
     * 'submitted_to_client'. Setelah terisi, basis data menolak perubahannya.
     */
    submittedAt: timestamp('submitted_at', { withTimezone: true, mode: 'date' }),
    submittedBy: uuid('submitted_by').references(() => users.id),
    /** Saran AI — tidak pernah dipakai untuk menyaring otomatis (SPEC §7.2). */
    aiMatchScore: smallint('ai_match_score'),
    aiMatchReasoning: jsonb('ai_match_reasoning'),
    aiScoredAt: timestamp('ai_scored_at', { withTimezone: true, mode: 'date' }),
    /** SPEC §8 — kapan klien membukanya di portal. Bagian berkas bukti. */
    clientViewedAt: timestamp('client_viewed_at', { withTimezone: true, mode: 'date' }),
    clientFeedback: text('client_feedback'),
    rejectedBy: rejectedByEnum('rejected_by'),
    rejectionReason: text('rejection_reason'),
    withdrawnAt: timestamp('withdrawn_at', { withTimezone: true, mode: 'date' }),
    notes: text('notes'),
  },
  (t) => [
    index('idx_submissions_job').on(t.jobId),
    index('idx_submissions_candidate').on(t.candidateId),
    index('idx_submissions_stage').on(t.stage),
    index('idx_submissions_submitted').on(t.submittedAt).where(sql`${t.submittedAt} IS NOT NULL`),
    // SPEC §5.6: satu kandidat tidak bisa diajukan dua kali ke lowongan yang sama.
    unique('uq_submission').on(t.jobId, t.candidateId),
    check(
      'chk_rejection_reason',
      sql`${t.stage} <> 'rejected' OR (${t.rejectedBy} IS NOT NULL AND ${t.rejectionReason} IS NOT NULL)`,
    ),
    check('submissions_ai_match_score_check', sql`${t.aiMatchScore} BETWEEN 0 AND 100`),
  ],
)

/**
 * Jejak audit tiap perpindahan tahap — SPEC §6.1.
 * SEMUA metrik dihitung dari tabel ini, bukan dari `submissions.stage`.
 */
export const submissionEvents = pgTable(
  'submission_events',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    submissionId: uuid('submission_id')
      .notNull()
      .references(() => submissions.id, { onDelete: 'cascade' }),
    fromStage: submissionStage('from_stage'),
    toStage: submissionStage('to_stage').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    actorUserId: uuid('actor_user_id').references(() => users.id),
    actorIsClient: boolean('actor_is_client').notNull().default(false),
    note: text('note'),
  },
  (t) => [
    index('idx_events_submission').on(t.submissionId, t.occurredAt),
    index('idx_events_to_stage').on(t.toStage, t.occurredAt),
  ],
)

// ------------------------------------------------------------ penempatan
// SPEC §4: angka komersial DISALIN, bukan direferensikan. Persentase fee klien
// bisa berubah tahun depan; tagihan lama harus tetap memakai angka saat itu.

export const placements = pgTable(
  'placements',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    submissionId: uuid('submission_id')
      .notNull()
      .unique()
      .references(() => submissions.id, { onDelete: 'restrict' }),
    candidateId: uuid('candidate_id')
      .notNull()
      .references(() => candidates.id, { onDelete: 'restrict' }),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'restrict' }),
    jobId: uuid('job_id')
      .notNull()
      .references(() => jobs.id, { onDelete: 'restrict' }),
    offerSignedDate: date('offer_signed_date', { mode: 'string' }).notNull(),
    startDate: date('start_date', { mode: 'string' }).notNull(),
    /** Gaji POKOK — bukan take-home pay, bukan total paket (SPEC §5.1). */
    monthlyBaseSalary: bigint('monthly_base_salary', { mode: 'bigint' }).notNull(),

    // Salinan ketentuan komersial pada saat penempatan dibuat.
    feePercent: numeric('fee_percent', { precision: 5, scale: 4 }).notNull(),
    splitFirstPercent: numeric('split_first_percent', { precision: 5, scale: 4 }).notNull().default('0.5000'),
    guaranteeDays: integer('guarantee_days').notNull().default(90),
    paymentTermsDays: integer('payment_terms_days').notNull().default(7),

    // Dihitung Postgres, bukan JavaScript — supaya uang tidak pernah lewat float.
    annualSalary: bigint('annual_salary', { mode: 'bigint' }).generatedAlwaysAs(
      sql`(monthly_base_salary * 12)`,
    ),
    feeAmount: bigint('fee_amount', { mode: 'bigint' }).generatedAlwaysAs(
      sql`(round(monthly_base_salary * 12 * fee_percent))::BIGINT`,
    ),
    guaranteeEndDate: date('guarantee_end_date', { mode: 'string' }).generatedAlwaysAs(
      sql`(start_date + guarantee_days)`,
    ),
    probationEndDate: date('probation_end_date', { mode: 'string' }),

    status: placementStatus('status').notNull().default('active'),
    endedAt: date('ended_at', { mode: 'string' }),
    endReason: text('end_reason'),

    // Garansi penggantian — SPEC §5.4
    replacementOfPlacementId: uuid('replacement_of_placement_id'),
    guaranteeVoided: boolean('guarantee_voided').notNull().default(false),
    guaranteeVoidReason: text('guarantee_void_reason'),

    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_placements_client').on(t.clientId),
    index('idx_placements_guarantee').on(t.guaranteeEndDate).where(sql`${t.status} = 'active'`),
    // Satu penempatan hanya boleh menjadi pengganti bagi satu penempatan lain.
    uniqueIndex('uq_placement_replacement')
      .on(t.replacementOfPlacementId)
      .where(sql`${t.replacementOfPlacementId} IS NOT NULL`),
    check('placements_monthly_base_salary_check', sql`${t.monthlyBaseSalary} > 0`),
    check('placements_fee_percent_check', sql`${t.feePercent} BETWEEN 0.10 AND 0.30`),
    check('chk_start_after_offer', sql`${t.startDate} >= ${t.offerSignedDate}`),
    check(
      'chk_void_reason',
      sql`${t.guaranteeVoided} = FALSE OR ${t.guaranteeVoidReason} IS NOT NULL`,
    ),
  ],
)

// ---------------------------------------------- tagihan (dua per penempatan)

export const invoices = pgTable(
  'invoices',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    placementId: uuid('placement_id')
      .notNull()
      .references(() => placements.id, { onDelete: 'restrict' }),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'restrict' }),
    /** NULL selama masih draft. */
    invoiceNumber: text('invoice_number').unique(),
    milestone: invoiceMilestone('milestone').notNull(),
    issueDate: date('issue_date', { mode: 'string' }),
    dueDate: date('due_date', { mode: 'string' }),
    grossAmount: bigint('gross_amount', { mode: 'bigint' }).notNull(),
    ppnAmount: bigint('ppn_amount', { mode: 'bigint' }).notNull().default(0n),
    pph23Amount: bigint('pph23_amount', { mode: 'bigint' }).notNull().default(0n),
    /** Yang benar-benar masuk rekening. Dihitung Postgres. */
    netReceivable: bigint('net_receivable', { mode: 'bigint' }).generatedAlwaysAs(
      sql`(gross_amount + ppn_amount - pph23_amount)`,
    ),
    status: invoiceStatus('status').notNull().default('draft'),
    sentAt: timestamp('sent_at', { withTimezone: true, mode: 'date' }),
    paidDate: date('paid_date', { mode: 'string' }),
    paidAmount: bigint('paid_amount', { mode: 'bigint' }),
    voidReason: text('void_reason'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_invoices_status').on(t.status),
    index('idx_invoices_due').on(t.dueDate).where(sql`${t.status} = 'sent'`),
    // Tepat satu tagihan per milestone per penempatan.
    unique('uq_invoice_milestone').on(t.placementId, t.milestone),
    check('invoices_gross_amount_check', sql`${t.grossAmount} >= 0`),
    check('invoices_ppn_amount_check', sql`${t.ppnAmount} >= 0`),
    check('invoices_pph23_amount_check', sql`${t.pph23Amount} >= 0`),
    check('invoices_paid_amount_check', sql`${t.paidAmount} >= 0`),
    check(
      'chk_sent_needs_number',
      sql`${t.status} = 'draft' OR ${t.status} = 'void' OR ${t.invoiceNumber} IS NOT NULL`,
    ),
    check('chk_void_reason', sql`${t.status} <> 'void' OR ${t.voidReason} IS NOT NULL`),
  ],
)

// ------------------------------------- aktivitas, template, portal, audit

export const activities = pgTable(
  'activities',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    entityType: text('entity_type').notNull(),
    entityId: uuid('entity_id').notNull(),
    type: activityType('type').notNull(),
    body: text('body').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    userId: uuid('user_id').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_activities_entity').on(t.entityType, t.entityId, t.occurredAt.desc()),
    check(
      'activities_entity_type_check',
      sql`${t.entityType} IN ('candidate','client','job','submission','placement')`,
    ),
  ],
)

export const messageTemplates = pgTable(
  'message_templates',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    name: text('name').notNull(),
    channel: text('channel').notNull(),
    /** Email saja. */
    subject: text('subject'),
    /** Mendukung {{nama_kandidat}} dsb. */
    body: text('body').notNull(),
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [check('message_templates_channel_check', sql`${t.channel} IN ('whatsapp','email')`)],
)

/** Magic link portal klien — SPEC §8. Token disimpan TER-HASH, bukan teks polos. */
export const clientPortalTokens = pgTable(
  'client_portal_tokens',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true, mode: 'date' }),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [index('idx_portal_tokens_client').on(t.clientId)],
)

/**
 * Jejak audit akses data pribadi — SPEC §9.4.
 * Tanpa tabel ini, kewajiban notifikasi kebocoran 3×24 jam mustahil dipenuhi.
 */
export const auditLog = pgTable(
  'audit_log',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    actorType: text('actor_type').notNull(),
    actorId: uuid('actor_id'),
    /** view_candidate, export_data, download_cv, delete_request, ... */
    action: text('action').notNull(),
    entityType: text('entity_type'),
    entityId: uuid('entity_id'),
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),
    detail: jsonb('detail'),
    occurredAt: timestamp('occurred_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_audit_entity').on(t.entityType, t.entityId, t.occurredAt.desc()),
    index('idx_audit_occurred').on(t.occurredAt.desc()),
    check('audit_log_actor_type_check', sql`${t.actorType} IN ('user','client','system')`),
  ],
)

/** Permintaan hak subjek data — SPEC §9.2 */
export const dataSubjectRequests = pgTable(
  'data_subject_requests',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    candidateId: uuid('candidate_id').references(() => candidates.id, { onDelete: 'set null' }),
    requestType: text('request_type').notNull(),
    requestedAt: timestamp('requested_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    requesterNote: text('requester_note'),
    handledBy: uuid('handled_by').references(() => users.id),
    handledAt: timestamp('handled_at', { withTimezone: true, mode: 'date' }),
    outcomeNote: text('outcome_note'),
  },
  (t) => [
    check(
      'data_subject_requests_request_type_check',
      sql`${t.requestType} IN ('akses','koreksi','penghapusan','penarikan_persetujuan','portabilitas')`,
    ),
  ],
)

// ----------------------------------------------------------- view bantu

/** Masa proteksi kandidat per klien — SPEC §5.5. */
export const candidateProtection = pgView('candidate_protection', {
  candidateId: uuid('candidate_id'),
  clientId: uuid('client_id'),
  firstSubmittedAt: timestamp('first_submitted_at', { withTimezone: true, mode: 'date' }),
  protectionUntil: timestamp('protection_until', { withTimezone: true, mode: 'date' }),
  isProtected: boolean('is_protected'),
}).existing()

/** Kandidat yang melewati masa retensi — SPEC §9.3. Melaporkan saja. */
export const candidatesPastRetention = pgView('candidates_past_retention', {
  id: uuid('id'),
  fullName: text('full_name'),
  lastActivityAt: timestamp('last_activity_at', { withTimezone: true, mode: 'date' }),
  retentionUntil: date('retention_until', { mode: 'string' }),
}).existing()

// -------------------------------------------------------------- tipe bantu

export type User = typeof users.$inferSelect
export type Client = typeof clients.$inferSelect
export type ClientAgreement = typeof clientAgreements.$inferSelect
export type Job = typeof jobs.$inferSelect
export type Candidate = typeof candidates.$inferSelect
export type Submission = typeof submissions.$inferSelect
export type SubmissionEvent = typeof submissionEvents.$inferSelect
export type Placement = typeof placements.$inferSelect
export type Invoice = typeof invoices.$inferSelect
export type CompanySettings = typeof companySettings.$inferSelect
export type PeranPengguna = (typeof userRole.enumValues)[number]
export type TahapPengajuan = (typeof submissionStage.enumValues)[number]
