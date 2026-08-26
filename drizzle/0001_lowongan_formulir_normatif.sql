-- Enam isian formulir kebutuhan klien yang normatif di praktik HR tapi belum
-- ada di skema versi 1.0. Disetujui pemilik 26 Agustus 2026.
--
-- Aman dijalankan di basis data yang sudah berisi data: seluruh kolom baru
-- boleh kosong atau punya nilai bawaan, jadi tidak ada baris lama yang perlu
-- diisi ulang dan tidak ada satu pun yang ditolak.
--
-- Yang sengaja TIDAK ditambahkan: preferensi jenis kelamin dan batas usia.
-- Keduanya diskriminatif, dan menyediakan kotaknya berarti mengundang
-- pemakaiannya.

ALTER TABLE jobs ADD COLUMN main_duties             TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE jobs ADD COLUMN department              TEXT;
ALTER TABLE jobs ADD COLUMN reports_to              TEXT;
ALTER TABLE jobs ADD COLUMN work_arrangement        TEXT;
ALTER TABLE jobs ADD COLUMN benefits                TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE jobs ADD COLUMN client_interview_stages TEXT[] NOT NULL DEFAULT '{}';
