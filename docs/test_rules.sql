-- Uji aturan bisnis SPEC §5 terhadap skema.
-- Jalankan: psql -d hh -v ON_ERROR_STOP=0 -f docs/test_rules.sql

\set QUIET on
\pset format aligned

-- ---------- data uji ----------
INSERT INTO users (id, email, password_hash, full_name, role) VALUES
  ('11111111-1111-1111-1111-111111111111','owner@test.id','x','Pemilik','owner');

INSERT INTO clients (id, name, status) VALUES
  ('22222222-2222-2222-2222-222222222222','PT Klien Uji','active');

INSERT INTO client_agreements (id, client_id, fee_percent, split_first_percent, guarantee_days, payment_terms_days, protection_months)
VALUES ('33333333-3333-3333-3333-333333333333','22222222-2222-2222-2222-222222222222',0.1500,0.5000,90,7,12);

INSERT INTO jobs (id, client_id, agreement_id, title, status, reason_previous_failed, opened_at)
VALUES ('44444444-4444-4444-4444-444444444444','22222222-2222-2222-2222-222222222222',
        '33333333-3333-3333-3333-333333333333','Sales Manager','open',
        'Kandidat sebelumnya kuat di produk tapi tidak terbiasa kelola tim', now());

INSERT INTO candidates (id, full_name, phone, expected_salary) VALUES
  ('55555555-5555-5555-5555-555555555555','Budi Santoso','081200000001', 9000000);

INSERT INTO submissions (id, job_id, candidate_id, stage, submitted_at, submitted_by)
VALUES ('66666666-6666-6666-6666-666666666666','44444444-4444-4444-4444-444444444444',
        '55555555-5555-5555-5555-555555555555','submitted_to_client',
        '2026-08-01 09:00:00+07','11111111-1111-1111-1111-111111111111');

\echo ''
\echo '=== 1. Perhitungan fee (SPEC 5.1) ============================='
INSERT INTO placements (id, submission_id, candidate_id, client_id, job_id,
                        offer_signed_date, start_date, monthly_base_salary,
                        fee_percent, split_first_percent, guarantee_days, payment_terms_days,
                        probation_end_date)
VALUES ('77777777-7777-7777-7777-777777777777','66666666-6666-6666-6666-666666666666',
        '55555555-5555-5555-5555-555555555555','22222222-2222-2222-2222-222222222222',
        '44444444-4444-4444-4444-444444444444',
        '2026-09-01','2026-09-15', 8333333, 0.1500, 0.5000, 90, 7, '2026-12-14');

SELECT monthly_base_salary AS gaji_pokok,
       annual_salary       AS gaji_tahunan,
       fee_percent,
       fee_amount,
       guarantee_end_date
FROM placements WHERE id = '77777777-7777-7777-7777-777777777777';

\echo ''
\echo '=== 2. Dua tagihan, jumlah harus PERSIS = fee_amount (SPEC 5.2) ==='
-- simulasi apa yang harus dilakukan service saat placement dibuat
WITH p AS (SELECT * FROM placements WHERE id='77777777-7777-7777-7777-777777777777'),
     s AS (SELECT is_pkp, ppn_rate, pph23_rate FROM company_settings WHERE id=1),
     calc AS (
       SELECT p.*, s.is_pkp, s.ppn_rate, s.pph23_rate,
              round(p.fee_amount * p.split_first_percent)::BIGINT AS first_gross
       FROM p CROSS JOIN s
     )
INSERT INTO invoices (placement_id, client_id, milestone, issue_date, due_date,
                      gross_amount, ppn_amount, pph23_amount, status)
SELECT id, client_id, 'first'::invoice_milestone, offer_signed_date, offer_signed_date + payment_terms_days,
       first_gross,
       CASE WHEN is_pkp THEN round(first_gross * ppn_rate)::BIGINT ELSE 0 END,
       round(first_gross * pph23_rate)::BIGINT, 'draft'::invoice_status
FROM calc
UNION ALL
SELECT id, client_id, 'second'::invoice_milestone, probation_end_date, probation_end_date + payment_terms_days,
       fee_amount - first_gross,
       CASE WHEN is_pkp THEN round((fee_amount - first_gross) * ppn_rate)::BIGINT ELSE 0 END,
       round((fee_amount - first_gross) * pph23_rate)::BIGINT, 'draft'::invoice_status
FROM calc;

SELECT milestone, issue_date, due_date, gross_amount, ppn_amount, pph23_amount, net_receivable
FROM invoices WHERE placement_id='77777777-7777-7777-7777-777777777777' ORDER BY milestone DESC;

SELECT p.fee_amount                       AS fee_penempatan,
       SUM(i.gross_amount)                AS jumlah_dua_tagihan,
       CASE WHEN p.fee_amount = SUM(i.gross_amount) THEN 'LULUS' ELSE 'GAGAL' END AS hasil
FROM placements p JOIN invoices i ON i.placement_id = p.id
WHERE p.id='77777777-7777-7777-7777-777777777777'
GROUP BY p.fee_amount;

\echo ''
\echo '=== 3. submitted_at tidak boleh diubah (SPEC 5.5) ============='
\echo 'Harapan: ERROR'
UPDATE submissions SET submitted_at = now() WHERE id='66666666-6666-6666-6666-666666666666';

\echo ''
\echo '=== 4. Duplikat pengajuan ditolak (SPEC 5.6) =================='
\echo 'Harapan: ERROR duplicate key'
INSERT INTO submissions (job_id, candidate_id)
VALUES ('44444444-4444-4444-4444-444444444444','55555555-5555-5555-5555-555555555555');

\echo ''
\echo '=== 5. Fee di luar rentang wajar ditolak (SPEC 5.1) ==========='
\echo 'Harapan: ERROR chk_fee_range'
INSERT INTO client_agreements (client_id, fee_percent)
VALUES ('22222222-2222-2222-2222-222222222222', 0.0500);

\echo ''
\echo '=== 6. Lowongan open wajib punya reason_previous_failed (6.3) =='
\echo 'Harapan: ERROR chk_reason_required_when_open'
INSERT INTO jobs (client_id, title, status)
VALUES ('22222222-2222-2222-2222-222222222222','Tanpa Alasan','open');

\echo ''
\echo '=== 7. Masa proteksi kandidat 12 bulan (SPEC 5.5) ============='
SELECT candidate_id, client_id, first_submitted_at, protection_until, is_protected
FROM candidate_protection;

\echo ''
\echo '=== 8. Penempatan pengganti tidak boleh dobel (SPEC 5.4) ======'
INSERT INTO candidates (id, full_name, phone) VALUES
  ('88888888-8888-8888-8888-888888888888','Citra Dewi','081200000002');
INSERT INTO submissions (id, job_id, candidate_id, stage) VALUES
  ('99999999-9999-9999-9999-999999999999','44444444-4444-4444-4444-444444444444',
   '88888888-8888-8888-8888-888888888888','signed');
INSERT INTO placements (id, submission_id, candidate_id, client_id, job_id, offer_signed_date,
                        start_date, monthly_base_salary, fee_percent, replacement_of_placement_id)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','99999999-9999-9999-9999-999999999999',
        '88888888-8888-8888-8888-888888888888','22222222-2222-2222-2222-222222222222',
        '44444444-4444-4444-4444-444444444444','2026-12-01','2026-12-15',8333333,0.1500,
        '77777777-7777-7777-7777-777777777777');
\echo 'Pengganti pertama: OK. Sekarang coba pengganti kedua untuk penempatan yang sama.'
\echo 'Harapan: ERROR uq_placement_replacement'
INSERT INTO candidates (id, full_name, phone) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','Eko Prasetyo','081200000003');
INSERT INTO submissions (id, job_id, candidate_id, stage) VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccccc','44444444-4444-4444-4444-444444444444',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','signed');
INSERT INTO placements (submission_id, candidate_id, client_id, job_id, offer_signed_date,
                        start_date, monthly_base_salary, fee_percent, replacement_of_placement_id)
VALUES ('cccccccc-cccc-cccc-cccc-cccccccccccc','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        '22222222-2222-2222-2222-222222222222','44444444-4444-4444-4444-444444444444',
        '2026-12-01','2026-12-15',8333333,0.1500,'77777777-7777-7777-7777-777777777777');

\echo ''
\echo '=== 9. Duplikat nomor telepon kandidat ditolak (SPEC 5.6) ====='
\echo 'Harapan: ERROR uq_candidates_phone'
INSERT INTO candidates (full_name, phone) VALUES ('Budi Santoso (dobel)','081200000001');

\echo ''
\echo '=== 10. PPN aktif setelah PKP (SPEC 5.3) ======================'
UPDATE company_settings SET is_pkp = TRUE WHERE id = 1;
SELECT 8333333::BIGINT * 12 AS gaji_tahunan,
       round(8333333::BIGINT * 12 * 0.15)::BIGINT AS fee,
       round(round(8333333::BIGINT * 12 * 0.15) * 0.11)::BIGINT AS ppn_bila_pkp,
       round(round(8333333::BIGINT * 12 * 0.15) * 0.02)::BIGINT AS pph23;
UPDATE company_settings SET is_pkp = FALSE WHERE id = 1;
