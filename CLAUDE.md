# CLAUDE.md — Aturan main repo ini

Baca `SPEC.md` sampai habis sebelum menulis kode apa pun. Dokumen ini hanya berisi
aturan kerja; kebenaran produk ada di `SPEC.md`.

---

## Konteks singkat

Sistem manajemen rekrutmen (headhunter) untuk perusahaan HR Indonesia yang baru
berdiri. Satu pemilik, mungkin 1–2 perekrut dalam setahun, ditambah akses lihat untuk
PIC klien. Volume tahun pertama: di bawah 1.500 kandidat dan di bawah 25 penempatan.

Sistem ini kecil. **Jangan membangun untuk skala yang tidak akan datang.** Tidak perlu
antrean pesan, cache berlapis, microservice, atau abstraksi repository. Server action
yang langsung memanggil Drizzle sudah tepat untuk ukuran ini.

---

## Sebelum mulai — tiga hal yang harus dibaca

1. `SPEC.md` §5 (Aturan Bisnis) — di sinilah uang perusahaan dijaga
2. `docs/schema.sql` — skema sudah final dan sudah diuji, jangan dirancang ulang
3. `docs/test_rules.sql` — 10 uji aturan bisnis yang harus tetap lulus

Skema sudah dijalankan di Postgres 16 dan seluruh constraint-nya terbukti bekerja.
Bila Anda ingin mengubah skema, jelaskan dulu alasannya dan tunggu persetujuan pemilik.

---

## Yang tidak boleh dilanggar

Setiap baris di bawah menutup satu cara sistem ini merugikan pemiliknya.

1. **`submissions.submitted_at` tidak pernah berubah.** Sudah dijaga trigger basis
   data. Jangan menonaktifkan trigger itu, jangan menambah jalur yang menimpanya.
2. **`submissions`, `placements`, `invoices` tidak pernah dihapus keras.** Pakai
   penanda pembatalan (`withdrawn_at`, status `void`). Ini catatan keuangan dan bukti.
3. **Angka komersial disalin ke `placements`, tidak direferensikan.** Saat menghitung
   tagihan, baca `placements.fee_percent`, bukan `client_agreements.fee_percent`.
4. **Dua tagihan per penempatan harus berjumlah persis `fee_amount`.** Tagihan pertama
   dibulatkan, tagihan kedua adalah sisanya. Ada tesnya — jangan sampai gagal.
5. **AI tidak pernah menolak kandidat.** Skor hanya saran. Tidak ada penyaringan
   otomatis, tidak ada kandidat yang disembunyikan karena skor rendah. Ini kewajiban
   UU PDP soal hak menolak profiling otomatis, bukan sekadar preferensi produk.
6. **Keluaran AI tidak pernah langsung ditulis ke `candidates`.** Selalu lewat
   `cv_extractions` dan konfirmasi manusia.
7. **`client_viewer` tidak pernah melihat** `current_salary`, catatan internal, skor
   AI, atau data klien lain. Filter berdasarkan `client_id` dari sesi — jangan pernah
   dari parameter URL.
8. **Peran `recruiter` tidak pernah melihat** nilai fee, tagihan, atau laporan
   pendapatan.

Bila sebuah permintaan bertentangan dengan salah satu poin di atas, hentikan dan
tanyakan ke pemilik. Jangan diam-diam menyesuaikan.

---

## Uang

- Semua nilai rupiah adalah `BIGINT` rupiah penuh. `Rp6.980.667` → `6980667`.
- **Jangan pernah memakai `number` JavaScript untuk aritmetika uang** di jalur yang
  menghasilkan nilai tersimpan. Pakai `BigInt` atau lakukan perhitungan di Postgres.
- Persentase disimpan sebagai pecahan `NUMERIC(5,4)`. `0.1500` = 15%.
- Pembulatan hanya di satu tempat: nilai tagihan pertama. Tagihan kedua = `fee_amount`
  dikurangi tagihan pertama. Jangan membulatkan keduanya secara terpisah.
- Format tampilan: `Rp1.234.567` — titik sebagai pemisah ribuan, tanpa desimal.
- Setiap layar yang menampilkan tagihan wajib menampilkan empat angka: bruto, PPN,
  PPh 23, dan yang benar-benar masuk rekening.

---

## Waktu

- Simpan `TIMESTAMPTZ`, tampilkan `Asia/Jakarta`.
- Jangan memakai `new Date()` di sisi klien untuk apa pun yang tersimpan.
- Tanggal bisnis (`start_date`, `issue_date`, `due_date`) bertipe `DATE` — tidak ada
  jam, tidak ada zona waktu.

---

## Konvensi kode

- TypeScript ketat. `any` hanya boleh di batas parsing keluaran AI, dan harus langsung
  divalidasi Zod.
- Server action untuk mutasi, React Server Component untuk baca. Hindari route handler
  kecuali untuk webhook dan unduhan berkas.
- Satu file Zod schema per entitas di `lib/validation/`. Validasi di server, bukan
  hanya di form.
- Query Drizzle di `lib/db/queries/<entitas>.ts`. Jangan menulis SQL mentah di
  komponen.
- Aturan bisnis di `lib/rules/`, bukan di komponen atau server action. Fungsi murni
  yang bisa diuji tanpa basis data: `hitungFee()`, `bagiDuaTagihan()`,
  `hitungTanggalGaransi()`, `cekMasaProteksi()`.
- Semua teks antarmuka Bahasa Indonesia. Nama variabel dan tabel Bahasa Inggris.
  Jangan mencampur di satu lapisan.
- Panggilan AI hanya lewat `lib/ai/`. Fitur tidak pernah memanggil penyedia langsung.

---

## Pengujian

Yang wajib ada tesnya — sisanya opsional:

| Yang diuji | Kenapa |
|---|---|
| `hitungFee()` | Salah di sini berarti salah menagih klien |
| `bagiDuaTagihan()` | Termasuk kasus rupiah ganjil. Jumlah harus persis. |
| Perhitungan PPh 23 dan PPN | Termasuk saat `is_pkp` masih `false` |
| `hitungTanggalGaransi()` | Termasuk tahun kabisat |
| `cekMasaProteksi()` | Batas tepat 12 bulan |
| Transisi tahap menulis `submission_events` | Semua metrik bergantung padanya |
| Isolasi portal klien | Coba akses ID klien lain lewat URL — harus 404, bukan 403 |

Jalankan `docs/test_rules.sql` terhadap basis data pengembangan setiap kali skema
disentuh. Sepuluh-duanya harus tetap berperilaku seperti yang tertulis di komentarnya.

---

## Urutan pembangunan

Ikuti `SPEC.md` §11. Ringkasnya:

```
Fase 0  Fondasi          → login jalan, migrasi bersih
Fase 1  Data induk       → klien, lowongan, kandidat, unggah CV
Fase 2  Pipeline         → pengajuan, tahapan, jejak audit
Fase 3  Uang             → penempatan, fee, dua tagihan, garansi   ← JANGAN DILEWATI
Fase 4  AI               → ekstraksi CV, skor kecocokan
Fase 5  Portal klien     → magic link, tampilan terbatas
Fase 6  Komunikasi       → template WhatsApp/email, dasbor
Fase 7  Kepatuhan PDP    → layar persetujuan, ekspor, penghapusan
```

**Jangan mulai Fase 4 sebelum Fase 3 selesai dan dipakai.** Godaan untuk membangun AI
lebih dulu itu nyata, dan itu cara paling umum proyek seperti ini berhenti setengah
jalan dengan fitur menarik tapi tanpa pelacakan tagihan.

Di akhir tiap fase, berhenti dan laporkan apa yang bisa dicoba pemilik. Jangan
menggabungkan dua fase dalam satu putaran kerja.

---

## Kepatuhan UU PDP

UU No. 27 Tahun 2022 berlaku penuh sejak Oktober 2024. Sanksi administratif sampai 2%
pendapatan tahunan. Sistem ini adalah pengendali data pribadi.

Yang harus benar sejak Fase 1, bukan ditunda ke Fase 7:

- Tabel `candidate_consents` terisi setiap kali kandidat dibuat
- Teks pemberitahuan tampil di form kandidat, menyebut tiga hal: data dibagikan ke
  perusahaan klien, diproses dengan bantuan layanan AI pihak ketiga, dan disimpan 24
  bulan sejak aktivitas terakhir
- `audit_log` mencatat setiap akses `client_viewer` ke data kandidat dan setiap ekspor

Yang boleh ditunda ke Fase 7: layar pengelolaan permintaan hak subjek data.

Jangan menambahkan field NIK, foto, agama, status pernikahan, atau nomor rekening
kandidat. Semuanya tidak diperlukan sampai tahap penawaran, dan data yang tidak
disimpan tidak bisa bocor.

---

## Basis data dan hosting

- **Postgres lewat Neon di Vercel Marketplace.** Vercel Postgres dihentikan Juni 2025
  dan dimigrasikan ke Neon — **jangan memakai paket `@vercel/postgres`**, dan jangan
  mengikuti tutorial yang menyebutnya.
- Berkas ke Vercel Blob. Jangan menyimpan berkas di basis data.
- Rahasia lewat variabel lingkungan Vercel. Jangan pernah menulis kunci API ke repo.
- Migrasi Drizzle berbasis berkas, di-commit ke repo. Jangan `db push` ke produksi.

---

## Yang sengaja tidak dibangun

Bila Anda mengusulkan salah satu di bawah, jawabannya tidak — kecuali pemilik meminta
secara eksplisit:

alih daya · absensi · payroll · BPJS · PPh 21 · job portal publik · API WhatsApp
Business berbayar · sinkronisasi kalender · tes daring kandidat · aplikasi seluler ·
multi-tenant · multi bahasa · impor massal LinkedIn · penolakan kandidat otomatis

---

## Cara bekerja dengan pemilik repo ini

Pemilik adalah praktisi HR, bukan programmer. Karena itu:

- Jelaskan pilihan teknis dalam akibatnya, bukan istilahnya. "Ini membuat data klien
  tidak bisa saling terlihat" lebih berguna daripada "ini menerapkan row-level
  security".
- Bila ada dua cara dan salah satunya lebih murah dirawat, pilih yang itu dan
  sebutkan alasannya.
- Setiap akhir fase, tuliskan cara mencobanya dalam langkah yang bisa diikuti tanpa
  membuka terminal.
- Bila menemukan sesuatu di `SPEC.md` yang keliru atau bertentangan, katakan. Spek itu
  disusun sebelum kode ada, jadi wajar ada yang meleset.
