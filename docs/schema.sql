-- =====================================================================
-- Modul Headhunter — Skema Postgres
-- PT HR & Workforce Solutions · versi 1.0 · 24 Agustus 2026
--
-- Konvensi:
--   · Semua uang  : BIGINT, rupiah penuh (Rp6.980.667 -> 6980667). Tidak pernah FLOAT.
--   · Semua waktu : TIMESTAMPTZ. Tampilan di Asia/Jakarta.
--   · Persentase  : NUMERIC(5,4) sebagai pecahan (0.1500 = 15%).
--   · Hapus data  : soft delete. Tabel bukti tidak pernah dihapus keras.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- pencarian nama kandidat

-- ---------------------------------------------------------------- enum
CREATE TYPE user_role         AS ENUM ('owner', 'recruiter');
CREATE TYPE client_status     AS ENUM ('prospect', 'active', 'dormant', 'blacklist');
CREATE TYPE job_status        AS ENUM ('draft', 'open', 'on_hold', 'filled', 'cancelled', 'lost');
CREATE TYPE candidate_status  AS ENUM ('active', 'placed', 'withdrawn', 'blacklist');
CREATE TYPE candidate_source  AS ENUM ('referral', 'job_portal', 'linkedin', 'walk_in', 'database', 'other');
CREATE TYPE document_type     AS ENUM ('cv', 'ijazah', 'sertifikat', 'portfolio', 'other');
CREATE TYPE consent_method    AS ENUM ('form_daring', 'whatsapp', 'email', 'kertas');
CREATE TYPE placement_status  AS ENUM ('active', 'guarantee_passed', 'failed', 'replaced');
CREATE TYPE invoice_milestone AS ENUM ('first', 'second');
CREATE TYPE invoice_status    AS ENUM ('draft', 'sent', 'paid', 'overdue', 'void');
CREATE TYPE activity_type     AS ENUM ('call', 'whatsapp', 'email', 'meeting', 'note', 'portal_feedback');
CREATE TYPE rejected_by       AS ENUM ('us', 'client');

-- Tahapan pipeline. Urutan penting — lihat SPEC.md §6.1
CREATE TYPE submission_stage AS ENUM (
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
  'withdrawn'
);

-- =====================================================================
-- PENGATURAN PERUSAHAAN — baris tunggal
-- =====================================================================
CREATE TABLE company_settings (
  id                  SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  legal_name          TEXT        NOT NULL,
  nib                 TEXT,
  npwp                TEXT,
  address             TEXT,
  phone               TEXT,
  email               TEXT,
  bank_name           TEXT,
  bank_account_no     TEXT,
  bank_account_name   TEXT,
  is_pkp              BOOLEAN     NOT NULL DEFAULT FALSE,  -- SPEC §5.3
  ppn_rate            NUMERIC(5,4) NOT NULL DEFAULT 0.1100,
  pph23_rate          NUMERIC(5,4) NOT NULL DEFAULT 0.0200,
  default_fee_percent NUMERIC(5,4) NOT NULL DEFAULT 0.1500,
  default_guarantee_days       INT NOT NULL DEFAULT 90,
  default_payment_terms_days   INT NOT NULL DEFAULT 7,
  default_protection_months    INT NOT NULL DEFAULT 12,
  default_retention_months     INT NOT NULL DEFAULT 24,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- PENGGUNA
-- =====================================================================
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT        NOT NULL UNIQUE,
  password_hash TEXT        NOT NULL,
  full_name     TEXT        NOT NULL,
  phone         TEXT,
  role          user_role   NOT NULL DEFAULT 'recruiter',
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- KLIEN
-- =====================================================================
CREATE TABLE clients (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT          NOT NULL,
  industry     TEXT,
  address      TEXT,
  npwp         TEXT,
  pic_name     TEXT,
  pic_title    TEXT,
  pic_phone    TEXT,
  pic_email    TEXT,
  status       client_status NOT NULL DEFAULT 'prospect',
  notes        TEXT,
  owner_user_id UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ
);
CREATE INDEX idx_clients_status ON clients(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_clients_name_trgm ON clients USING gin (name gin_trgm_ops);

-- Perjanjian jasa rekrutmen. Ketentuan komersial hidup di sini, bukan di clients.
CREATE TABLE client_agreements (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  agreement_number    TEXT,
  signed_date         DATE,
  start_date          DATE,
  end_date            DATE,
  fee_percent         NUMERIC(5,4) NOT NULL,
  split_first_percent NUMERIC(5,4) NOT NULL DEFAULT 0.5000,
  guarantee_days      INT          NOT NULL DEFAULT 90,
  payment_terms_days  INT          NOT NULL DEFAULT 7,
  protection_months   INT          NOT NULL DEFAULT 12,   -- SPEC §5.5, Pasal 4 perjanjian
  file_key            TEXT,
  is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
  notes               TEXT,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),

  -- SPEC §5.1: tolak fee di luar rentang wajar
  CONSTRAINT chk_fee_range   CHECK (fee_percent BETWEEN 0.10 AND 0.30),
  CONSTRAINT chk_split_range CHECK (split_first_percent BETWEEN 0 AND 1),
  CONSTRAINT chk_dates       CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);
CREATE INDEX idx_agreements_client ON client_agreements(client_id) WHERE is_active;

-- =====================================================================
-- LOWONGAN
-- =====================================================================
CREATE TABLE jobs (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id              UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  agreement_id           UUID REFERENCES client_agreements(id),
  title                  TEXT       NOT NULL,
  headcount              INT        NOT NULL DEFAULT 1 CHECK (headcount > 0),
  location               TEXT,
  employment_type        TEXT,                       -- tetap / PKWT / kontrak
  salary_min             BIGINT CHECK (salary_min >= 0),
  salary_max             BIGINT CHECK (salary_max >= 0),
  must_have              TEXT[]     NOT NULL DEFAULT '{}',
  nice_to_have           TEXT[]     NOT NULL DEFAULT '{}',

  -- SPEC §6.3 — field paling bernilai. Wajib saat status pindah ke 'open'.
  reason_previous_failed TEXT,

  decision_maker         TEXT,
  interviewer            TEXT,
  vacancy_age_note       TEXT,                       -- "sudah kosong berapa lama"
  target_start_date      DATE,
  screening_questions    TEXT[]     NOT NULL DEFAULT '{}',   -- hasil AI §7.3, sudah disunting
  status                 job_status NOT NULL DEFAULT 'draft',
  owner_user_id          UUID REFERENCES users(id),
  opened_at              TIMESTAMPTZ,
  closed_at              TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at             TIMESTAMPTZ,

  -- Enam isian yang normatif di formulir kebutuhan klien tapi belum ada di
  -- versi 1.0. Ditambahkan 26 Agustus 2026 atas persetujuan pemilik.
  --
  -- Sengaja ditaruh di URUTAN PALING AKHIR, bukan disisipkan di tengah tabel
  -- meski secara isi lebih cocok di atas. Alasannya: basis data yang sudah jalan
  -- hanya bisa menambah kolom di belakang. Kalau urutan di berkas ini berbeda
  -- dari urutan hasil migrasi, `npm run db:periksa-skema` akan melaporkannya
  -- berbeda — dan pemeriksaan itu justru yang menjaga keduanya tidak menyimpang.
  --
  -- Yang sengaja TIDAK ditambahkan meski sering ada di formulir kebutuhan:
  -- preferensi jenis kelamin dan batas usia. Keduanya diskriminatif, dan
  -- menyediakan kotaknya berarti mengundang pemakaiannya.
  main_duties             TEXT[]     NOT NULL DEFAULT '{}',  -- tugas utama, satu baris satu tugas
  department              TEXT,                              -- departemen / divisi
  reports_to              TEXT,                              -- jabatan atasan langsung
  work_arrangement        TEXT,                              -- WFO / WFH / hybrid
  benefits                TEXT[]     NOT NULL DEFAULT '{}',  -- tunjangan di luar gaji pokok
  client_interview_stages TEXT[]     NOT NULL DEFAULT '{}',  -- tahapan wawancara di sisi klien

  CONSTRAINT chk_salary_range CHECK (salary_max IS NULL OR salary_min IS NULL OR salary_max >= salary_min),
  -- lowongan terbuka wajib punya jawaban kenapa kandidat sebelumnya gagal
  CONSTRAINT chk_reason_required_when_open
    CHECK (status <> 'open' OR (reason_previous_failed IS NOT NULL AND length(btrim(reason_previous_failed)) > 0))
);
CREATE INDEX idx_jobs_client ON jobs(client_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_jobs_status ON jobs(status)    WHERE deleted_at IS NULL;

-- =====================================================================
-- KANDIDAT
-- Catatan PDP (SPEC §9.5): tidak ada kolom NIK, foto, agama, status kawin,
-- atau nomor rekening. Data yang tidak disimpan tidak bisa bocor.
-- =====================================================================
CREATE TABLE candidates (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name          TEXT             NOT NULL,
  phone              TEXT,                            -- nomor WhatsApp
  email              TEXT,
  domicile_city      TEXT,
  current_company    TEXT,
  current_title      TEXT,
  years_experience   NUMERIC(4,1) CHECK (years_experience >= 0),
  education          TEXT,
  skills             TEXT[]           NOT NULL DEFAULT '{}',
  current_salary     BIGINT CHECK (current_salary >= 0),   -- TIDAK PERNAH tampil ke client_viewer
  expected_salary    BIGINT CHECK (expected_salary >= 0),
  notice_period_days INT CHECK (notice_period_days >= 0),
  source             candidate_source NOT NULL DEFAULT 'other',
  source_detail      TEXT,
  status             candidate_status NOT NULL DEFAULT 'active',
  owner_user_id      UUID REFERENCES users(id),
  notes              TEXT,
  is_anonymized      BOOLEAN          NOT NULL DEFAULT FALSE,  -- SPEC §9.2 hak penghapusan
  anonymized_at      TIMESTAMPTZ,
  last_activity_at   TIMESTAMPTZ      NOT NULL DEFAULT now(), -- dasar hitung retensi
  created_at         TIMESTAMPTZ      NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ      NOT NULL DEFAULT now(),
  deleted_at         TIMESTAMPTZ
);
CREATE INDEX idx_candidates_name_trgm ON candidates USING gin (full_name gin_trgm_ops);
CREATE INDEX idx_candidates_skills    ON candidates USING gin (skills);
CREATE INDEX idx_candidates_status    ON candidates(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_candidates_activity  ON candidates(last_activity_at);
-- deteksi duplikat (SPEC §5.6) — parsial supaya NULL tidak bentrok
CREATE UNIQUE INDEX uq_candidates_phone ON candidates(phone)
  WHERE phone IS NOT NULL AND deleted_at IS NULL AND is_anonymized = FALSE;
CREATE UNIQUE INDEX uq_candidates_email ON candidates(lower(email))
  WHERE email IS NOT NULL AND deleted_at IS NULL AND is_anonymized = FALSE;

-- Dokumen kandidat
CREATE TABLE candidate_documents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID          NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  type         document_type NOT NULL DEFAULT 'cv',
  file_key     TEXT          NOT NULL,        -- kunci Vercel Blob
  file_name    TEXT          NOT NULL,
  mime_type    TEXT,
  size_bytes   BIGINT,
  is_current   BOOLEAN       NOT NULL DEFAULT TRUE,
  uploaded_by  UUID REFERENCES users(id),
  uploaded_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_docs_candidate ON candidate_documents(candidate_id);

-- Hasil ekstraksi AI — SPEC §7.1. Terpisah dari candidates dengan sengaja.
CREATE TABLE cv_extractions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id   UUID        NOT NULL REFERENCES candidate_documents(id) ON DELETE CASCADE,
  model         TEXT        NOT NULL,
  raw_json      JSONB       NOT NULL,
  cost_idr      BIGINT      NOT NULL DEFAULT 0,   -- supaya biaya AI terlihat
  latency_ms    INT,
  error_message TEXT,
  extracted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_by  UUID REFERENCES users(id),        -- NULL = belum dikonfirmasi manusia
  confirmed_at  TIMESTAMPTZ
);
CREATE INDEX idx_extractions_doc       ON cv_extractions(document_id);
CREATE INDEX idx_extractions_unconfirmed ON cv_extractions(extracted_at) WHERE confirmed_at IS NULL;

-- Persetujuan pemrosesan data — SPEC §9.1. Wajib UU 27/2022.
CREATE TABLE candidate_consents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id     UUID           NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  purpose          TEXT           NOT NULL,
  notice_version   TEXT           NOT NULL,     -- versi teks pemberitahuan yang disetujui
  method           consent_method NOT NULL,
  evidence         TEXT,                        -- teks persetujuan / kunci tangkapan layar
  ip_address       INET,
  granted_at       TIMESTAMPTZ    NOT NULL DEFAULT now(),
  retention_until  DATE           NOT NULL,
  withdrawn_at     TIMESTAMPTZ,
  withdrawal_note  TEXT
);
CREATE INDEX idx_consents_candidate ON candidate_consents(candidate_id);
CREATE INDEX idx_consents_active    ON candidate_consents(candidate_id) WHERE withdrawn_at IS NULL;

-- =====================================================================
-- PENGAJUAN — TABEL BUKTI
-- SPEC §5.5 dan §5.7: submitted_at tidak pernah diubah, baris tidak pernah
-- dihapus keras. Ini dasar klaim fee bila terjadi sengketa.
-- =====================================================================
CREATE TABLE submissions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id              UUID             NOT NULL REFERENCES jobs(id)       ON DELETE RESTRICT,
  candidate_id        UUID             NOT NULL REFERENCES candidates(id) ON DELETE RESTRICT,
  document_id         UUID REFERENCES candidate_documents(id),  -- CV versi mana yang dikirim
  stage               submission_stage NOT NULL DEFAULT 'sourced',
  stage_updated_at    TIMESTAMPTZ      NOT NULL DEFAULT now(),

  created_at          TIMESTAMPTZ      NOT NULL DEFAULT now(),
  -- stempel waktu bernilai hukum: diisi saat stage pertama kali mencapai
  -- 'submitted_to_client'. Setelah terisi, IMMUTABLE (lihat trigger di bawah).
  submitted_at        TIMESTAMPTZ,
  submitted_by        UUID REFERENCES users(id),

  ai_match_score      SMALLINT CHECK (ai_match_score BETWEEN 0 AND 100),
  ai_match_reasoning  JSONB,
  ai_scored_at        TIMESTAMPTZ,

  client_viewed_at    TIMESTAMPTZ,                 -- SPEC §8, bagian berkas bukti
  client_feedback     TEXT,

  rejected_by         rejected_by,
  rejection_reason    TEXT,
  withdrawn_at        TIMESTAMPTZ,
  notes               TEXT,

  -- SPEC §5.6: satu kandidat tidak bisa diajukan dua kali ke lowongan yang sama
  CONSTRAINT uq_submission UNIQUE (job_id, candidate_id),
  CONSTRAINT chk_rejection_reason
    CHECK (stage <> 'rejected' OR (rejected_by IS NOT NULL AND rejection_reason IS NOT NULL))
);
CREATE INDEX idx_submissions_job       ON submissions(job_id);
CREATE INDEX idx_submissions_candidate ON submissions(candidate_id);
CREATE INDEX idx_submissions_stage     ON submissions(stage);
CREATE INDEX idx_submissions_submitted ON submissions(submitted_at) WHERE submitted_at IS NOT NULL;

-- submitted_at tidak boleh diubah setelah terisi
CREATE OR REPLACE FUNCTION guard_submitted_at() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.submitted_at IS NOT NULL AND NEW.submitted_at IS DISTINCT FROM OLD.submitted_at THEN
    RAISE EXCEPTION 'submitted_at bersifat tetap dan tidak boleh diubah (SPEC 5.5)';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_guard_submitted_at
  BEFORE UPDATE ON submissions
  FOR EACH ROW EXECUTE FUNCTION guard_submitted_at();

-- Jejak audit tiap perpindahan tahap — SPEC §6.1.
-- SEMUA metrik dihitung dari tabel ini, bukan dari submissions.stage.
CREATE TABLE submission_events (
  id             BIGSERIAL PRIMARY KEY,
  submission_id  UUID             NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  from_stage     submission_stage,
  to_stage       submission_stage NOT NULL,
  occurred_at    TIMESTAMPTZ      NOT NULL DEFAULT now(),
  actor_user_id  UUID REFERENCES users(id),
  actor_is_client BOOLEAN         NOT NULL DEFAULT FALSE,
  note           TEXT
);
CREATE INDEX idx_events_submission ON submission_events(submission_id, occurred_at);
CREATE INDEX idx_events_to_stage   ON submission_events(to_stage, occurred_at);

-- =====================================================================
-- PENEMPATAN
-- SPEC §4: angka disalin, bukan direferensikan. Persentase fee klien bisa
-- berubah tahun depan; tagihan lama harus tetap memakai angka saat itu.
-- =====================================================================
CREATE TABLE placements (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id             UUID NOT NULL UNIQUE REFERENCES submissions(id) ON DELETE RESTRICT,
  candidate_id              UUID NOT NULL REFERENCES candidates(id) ON DELETE RESTRICT,
  client_id                 UUID NOT NULL REFERENCES clients(id)    ON DELETE RESTRICT,
  job_id                    UUID NOT NULL REFERENCES jobs(id)       ON DELETE RESTRICT,

  offer_signed_date         DATE   NOT NULL,
  start_date                DATE   NOT NULL,
  monthly_base_salary       BIGINT NOT NULL CHECK (monthly_base_salary > 0),  -- gaji POKOK

  -- salinan ketentuan komersial pada saat penempatan
  fee_percent               NUMERIC(5,4) NOT NULL CHECK (fee_percent BETWEEN 0.10 AND 0.30),
  split_first_percent       NUMERIC(5,4) NOT NULL DEFAULT 0.5000,
  guarantee_days            INT    NOT NULL DEFAULT 90,
  payment_terms_days        INT    NOT NULL DEFAULT 7,

  annual_salary             BIGINT GENERATED ALWAYS AS (monthly_base_salary * 12) STORED,
  fee_amount                BIGINT GENERATED ALWAYS AS
                              (round(monthly_base_salary * 12 * fee_percent)::BIGINT) STORED,
  guarantee_end_date        DATE GENERATED ALWAYS AS (start_date + guarantee_days) STORED,
  probation_end_date        DATE,

  status                    placement_status NOT NULL DEFAULT 'active',
  ended_at                  DATE,
  end_reason                TEXT,

  -- garansi penggantian — SPEC §5.4
  replacement_of_placement_id UUID REFERENCES placements(id),
  guarantee_voided            BOOLEAN NOT NULL DEFAULT FALSE,
  guarantee_void_reason       TEXT,

  created_by                UUID REFERENCES users(id),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_start_after_offer CHECK (start_date >= offer_signed_date),
  CONSTRAINT chk_void_reason
    CHECK (guarantee_voided = FALSE OR guarantee_void_reason IS NOT NULL)
);
CREATE INDEX idx_placements_client    ON placements(client_id);
CREATE INDEX idx_placements_guarantee ON placements(guarantee_end_date) WHERE status = 'active';
-- satu penempatan hanya boleh menjadi pengganti bagi satu penempatan lain
CREATE UNIQUE INDEX uq_placement_replacement ON placements(replacement_of_placement_id)
  WHERE replacement_of_placement_id IS NOT NULL;

-- =====================================================================
-- TAGIHAN — dua per penempatan, SPEC §5.2
-- =====================================================================
CREATE TABLE invoices (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_id   UUID              NOT NULL REFERENCES placements(id) ON DELETE RESTRICT,
  client_id      UUID              NOT NULL REFERENCES clients(id)    ON DELETE RESTRICT,
  invoice_number TEXT UNIQUE,                     -- NULL selama draft
  milestone      invoice_milestone NOT NULL,

  issue_date     DATE,
  due_date       DATE,

  gross_amount   BIGINT NOT NULL CHECK (gross_amount >= 0),
  ppn_amount     BIGINT NOT NULL DEFAULT 0 CHECK (ppn_amount   >= 0),
  pph23_amount   BIGINT NOT NULL DEFAULT 0 CHECK (pph23_amount >= 0),
  net_receivable BIGINT GENERATED ALWAYS AS (gross_amount + ppn_amount - pph23_amount) STORED,

  status         invoice_status NOT NULL DEFAULT 'draft',
  sent_at        TIMESTAMPTZ,
  paid_date      DATE,
  paid_amount    BIGINT CHECK (paid_amount >= 0),
  void_reason    TEXT,
  notes          TEXT,

  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- tepat satu tagihan per milestone per penempatan
  CONSTRAINT uq_invoice_milestone UNIQUE (placement_id, milestone),
  CONSTRAINT chk_sent_needs_number
    CHECK (status = 'draft' OR status = 'void' OR invoice_number IS NOT NULL),
  CONSTRAINT chk_void_reason CHECK (status <> 'void' OR void_reason IS NOT NULL)
);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due    ON invoices(due_date) WHERE status = 'sent';

-- =====================================================================
-- AKTIVITAS, TEMPLATE, PORTAL, AUDIT
-- =====================================================================
CREATE TABLE activities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT          NOT NULL CHECK (entity_type IN ('candidate','client','job','submission','placement')),
  entity_id   UUID          NOT NULL,
  type        activity_type NOT NULL,
  body        TEXT          NOT NULL,
  occurred_at TIMESTAMPTZ   NOT NULL DEFAULT now(),
  user_id     UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_activities_entity ON activities(entity_type, entity_id, occurred_at DESC);

CREATE TABLE message_templates (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  channel    TEXT NOT NULL CHECK (channel IN ('whatsapp','email')),
  subject    TEXT,                                   -- email saja
  body       TEXT NOT NULL,                          -- mendukung {{nama_kandidat}} dsb.
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Magic link portal klien — SPEC §8. Token disimpan ter-hash.
CREATE TABLE client_portal_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    UUID        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  email        TEXT        NOT NULL,
  token_hash   TEXT        NOT NULL UNIQUE,
  expires_at   TIMESTAMPTZ NOT NULL,
  consumed_at  TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_portal_tokens_client ON client_portal_tokens(client_id);

-- Jejak audit akses data pribadi — SPEC §9.4.
-- Tanpa tabel ini, kewajiban notifikasi kebocoran 3x24 jam mustahil dipenuhi.
CREATE TABLE audit_log (
  id           BIGSERIAL PRIMARY KEY,
  actor_type   TEXT NOT NULL CHECK (actor_type IN ('user','client','system')),
  actor_id     UUID,
  action       TEXT NOT NULL,        -- view_candidate, export_data, download_cv, delete_request, ...
  entity_type  TEXT,
  entity_id    UUID,
  ip_address   INET,
  user_agent   TEXT,
  detail       JSONB,
  occurred_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_entity   ON audit_log(entity_type, entity_id, occurred_at DESC);
CREATE INDEX idx_audit_occurred ON audit_log(occurred_at DESC);

-- Permintaan hak subjek data — SPEC §9.2
CREATE TABLE data_subject_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id  UUID REFERENCES candidates(id) ON DELETE SET NULL,
  request_type  TEXT NOT NULL CHECK (request_type IN ('akses','koreksi','penghapusan','penarikan_persetujuan','portabilitas')),
  requested_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  requester_note TEXT,
  handled_by    UUID REFERENCES users(id),
  handled_at    TIMESTAMPTZ,
  outcome_note  TEXT
);

-- =====================================================================
-- VIEW BANTU
-- =====================================================================

-- Masa proteksi kandidat per klien — SPEC §5.5.
-- Dipakai untuk peringatan saat mengajukan dan untuk ekspor bukti.
CREATE VIEW candidate_protection AS
SELECT
  s.candidate_id,
  j.client_id,
  MIN(s.submitted_at) AS first_submitted_at,
  MIN(s.submitted_at) + (COALESCE(ca.protection_months, 12) || ' months')::INTERVAL AS protection_until,
  (MIN(s.submitted_at) + (COALESCE(ca.protection_months, 12) || ' months')::INTERVAL) > now() AS is_protected
FROM submissions s
JOIN jobs j ON j.id = s.job_id
LEFT JOIN client_agreements ca ON ca.id = j.agreement_id
WHERE s.submitted_at IS NOT NULL
GROUP BY s.candidate_id, j.client_id, ca.protection_months;

-- Kandidat yang melewati masa retensi — SPEC §9.3.
-- Melaporkan saja; keputusan hapus ada pada owner.
CREATE VIEW candidates_past_retention AS
SELECT c.id, c.full_name, c.last_activity_at, cc.retention_until
FROM candidates c
JOIN LATERAL (
  SELECT retention_until FROM candidate_consents
  WHERE candidate_id = c.id AND withdrawn_at IS NULL
  ORDER BY granted_at DESC LIMIT 1
) cc ON TRUE
WHERE c.is_anonymized = FALSE
  AND c.deleted_at IS NULL
  AND cc.retention_until < CURRENT_DATE;

-- =====================================================================
-- DATA AWAL
-- =====================================================================
INSERT INTO company_settings (id, legal_name, is_pkp)
VALUES (1, 'PT [NAMA PERUSAHAAN]', FALSE)
ON CONFLICT (id) DO NOTHING;
