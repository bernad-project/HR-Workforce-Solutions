# SPEC — Modul Headhunter

Sistem manajemen rekrutmen untuk PT HR & Workforce Solutions.
Versi spek 1.0 · 24 Agustus 2026 · Bahasa antarmuka: Indonesia

---

## 0. Cara membaca dokumen ini

Dokumen ini adalah brief pembangunan, bukan daftar keinginan. Bagian **Aturan Bisnis**
(§5) adalah bagian yang paling penting — di situlah uang perusahaan dijaga, dan tidak
boleh disederhanakan tanpa persetujuan pemilik.

Bila ada pertentangan antara bagian dokumen ini, urutan yang menang:
§5 Aturan Bisnis → §4 Model Data → §6 Alur Kerja → sisanya.

**Jangan bangun semuanya sekaligus.** Ikuti urutan fase di §11. Fase 3 (uang) harus
selesai sebelum Fase 4 (AI). Alasannya di §11.

---

## 1. Konteks bisnis

Perusahaan baru, satu orang pemilik, modal di bawah Rp25 juta. Pendapatan pertama
berasal dari jasa headhunting — bukan dari alih daya — karena headhunting tidak
menuntut talangan gaji.

Volume yang realistis untuk 12 bulan pertama:

| Entitas | Perkiraan tahun pertama |
|---|---|
| Klien aktif | 5–15 |
| Lowongan | 20–60 |
| Kandidat di basis data | 300–1.500 |
| Pengajuan ke klien | 100–400 |
| Penempatan berhasil | 6–21 |

Artinya: **sistem ini tidak perlu skala besar.** Yang dibutuhkan adalah ketelitian
pada jejak bukti dan perhitungan uang, bukan performa tinggi. Jangan melakukan
optimasi prematur.

Modul alih daya (absensi, payroll, BPJS, PPh 21) **di luar ruang lingkup versi ini.**
Model data boleh dirancang agar tidak menghalangi penambahannya nanti, tapi jangan
ada tabel atau layar untuk itu sekarang.

---

## 2. Tujuan sistem

Berurutan, dari yang paling penting:

1. **Melindungi pendapatan.** Setiap kandidat yang diajukan ke klien tercatat dengan
   stempel waktu yang bisa dijadikan bukti. Ini menjaga klausul proteksi kandidat 12
   bulan di perjanjian jasa rekrutmen.
2. **Memastikan tidak ada tagihan yang terlewat.** Setiap penempatan menghasilkan dua
   tagihan pada dua tenggat berbeda. Sistem yang membiarkan satu terlewat lebih mahal
   daripada tidak punya sistem.
3. **Mengubah kandidat yang gagal menjadi aset.** Kandidat yang tidak cocok di satu
   klien harus mudah ditemukan kembali untuk klien berikutnya.
4. **Memangkas waktu penyaringan.** AI membantu mengekstraksi dan menilai CV, tapi
   keputusan tetap di tangan manusia (§7).
5. **Memberi klien transparansi.** Portal klien adalah pembeda komersial terhadap
   vendor kecil lain yang masih mengirim status lewat pesan.

**Bukan tujuan sistem ini:** menjadi job portal publik, mengelola payroll, menggantikan
akuntansi, atau melakukan wawancara otomatis.

---

## 3. Peran pengguna

| Peran | Siapa | Akses |
|---|---|---|
| `owner` | Pemilik perusahaan | Semua. Satu-satunya yang bisa mengubah persentase fee, menghapus data, dan melihat laporan keuangan. |
| `recruiter` | Perekrut internal (0 orang sekarang, 1–2 dalam 12 bulan) | Kandidat, lowongan, pengajuan, aktivitas. **Tidak** bisa melihat nilai fee, tagihan, atau laporan pendapatan. |
| `client_viewer` | PIC di perusahaan klien | Hanya lowongan miliknya sendiri dan kandidat yang diajukan ke lowongan itu. Detail di §8. |

Autentikasi:
- `owner` dan `recruiter`: email + kata sandi, sesi 30 hari.
- `client_viewer`: **magic link** ke email, tanpa kata sandi, token berlaku 30 hari,
  sekali pakai untuk pembuatan sesi. Alasannya: klien tidak akan mau mengelola satu
  kata sandi lagi, dan reset kata sandi adalah beban dukungan yang tidak perlu.

---

## 4. Model data

Skema lengkap ada di `docs/schema.sql`. Ringkasan entitas dan hubungannya:

```
users ──┬─< candidates (owner_user_id)
        ├─< jobs (owner_user_id)
        └─< submission_events (actor_user_id)

clients ──┬─< client_agreements
          ├─< jobs
          ├─< client_portal_tokens
          └─< invoices

jobs ──< submissions >── candidates
                │
                ├─< submission_events        (jejak audit tiap perpindahan tahap)
                └─── placements ──< invoices  (dua tagihan per penempatan)

candidates ──┬─< candidate_documents ──< cv_extractions
             ├─< candidate_consents          (kewajiban UU PDP)
             └─< activities
```

### Catatan model data yang tidak boleh diubah

**`submissions` adalah tabel bukti.** Baris di sini tidak pernah dihapus keras, hanya
ditandai `withdrawn_at`. `submitted_at` tidak pernah boleh diubah setelah dibuat.
Kolom ini yang menjadi dasar klaim fee bila klien merekrut kandidat lewat jalur lain.

**`placements` menyimpan salinan angka, bukan referensi.** `fee_percent`,
`monthly_base_salary`, dan `guarantee_days` disalin dari perjanjian saat penempatan
dibuat — jangan dibaca ulang dari `clients` atau `client_agreements` ketika menghitung
tagihan. Persentase fee klien bisa berubah tahun depan; tagihan lama harus tetap
memakai angka yang berlaku saat itu.

**`cv_extractions` terpisah dari `candidates`.** Hasil AI masuk ke tabel ekstraksi
dulu. Field di `candidates` hanya terisi setelah manusia menekan konfirmasi. Alasannya
ada di §7 dan §9.

**Semua uang disimpan sebagai `BIGINT` rupiah penuh**, bukan desimal, bukan sen.
Rp6.980.667 disimpan sebagai `6980667`. Jangan pakai `FLOAT` untuk uang.

**Semua waktu disimpan `TIMESTAMPTZ`**, ditampilkan dalam `Asia/Jakarta`.

---

## 5. Aturan bisnis

Bagian terpenting. Setiap aturan di sini berasal dari draf perjanjian jasa rekrutmen
perusahaan dan harus ditegakkan di lapisan basis data atau service, bukan hanya di UI.

### 5.1 Perhitungan fee

```
annual_salary = monthly_base_salary × 12
fee_amount    = annual_salary × fee_percent
```

- `fee_percent` default per klien diambil dari `client_agreements.fee_percent`.
- Rentang wajar 12%–20%. **Sistem menolak nilai di bawah 10% atau di atas 30%**
  kecuali `owner` menimpa secara eksplisit dengan alasan tertulis.
- `monthly_base_salary` adalah **gaji pokok**, bukan take-home pay, bukan total paket.
  Beri label jelas di form — ini sumber sengketa paling umum.

### 5.2 Dua tagihan per penempatan

Saat sebuah `placement` dibuat, sistem **otomatis membuat dua baris `invoices`
berstatus `draft`**:

| Milestone | Nilai | Tanggal terbit | Jatuh tempo |
|---|---|---|---|
| `first` | `fee_amount × split_first_percent` (default 50%) | `offer_signed_date` | terbit + `payment_terms_days` (default 7) |
| `second` | `fee_amount − nilai tagihan pertama` | `probation_end_date` | terbit + `payment_terms_days` |

Tagihan kedua **tidak boleh** berstatus `sent` sebelum `placement.status` menjadi
`guarantee_passed` atau kandidat dikonfirmasi lulus masa percobaan.

Pembulatan: nilai tagihan pertama dibulatkan ke rupiah penuh; tagihan kedua adalah
sisanya. Jumlah keduanya harus persis sama dengan `fee_amount` — tulis tes untuk ini.

### 5.3 Pajak pada tagihan

```
pph23_amount   = gross_amount × 0,02          (selalu, klien memotong)
ppn_amount     = gross_amount × 0,11          (hanya bila company.is_pkp = true)
net_receivable = gross_amount + ppn_amount − pph23_amount
```

`is_pkp` adalah pengaturan tingkat perusahaan, **default `false`**. Perusahaan baru
belum PKP sampai omzet melewati Rp4,8 miliar per tahun.

Tampilkan keempat angka di layar tagihan. Perekrut sering lupa bahwa yang masuk
rekening bukan nilai fee.

### 5.4 Garansi penggantian

```
guarantee_end_date = start_date + guarantee_days   (default 90 hari)
```

- Bila kandidat berhenti sebelum `guarantee_end_date`, `placement.status` menjadi
  `failed` dan sistem menawarkan pembuatan **penempatan pengganti** yang terhubung
  lewat `replacement_of_placement_id`.
- Penempatan pengganti **tidak menghasilkan tagihan baru**. Sistem harus mencegahnya.
- **Satu kali penggantian gratis per penempatan.** Bila penempatan pengganti juga
  gagal, sistem menandai dan meminta keputusan `owner` — tidak otomatis gratis lagi.
- Garansi bisa ditandai `void` dengan alasan (perubahan kebijakan klien, pembatalan
  posisi, keterlambatan pembayaran upah, kondisi kerja berbeda dari yang disampaikan).
  Alasan wajib diisi, bukan opsional.

### 5.5 Proteksi kandidat — fitur yang melindungi pendapatan

Perjanjian jasa rekrutmen Pasal 4: klien tidak boleh merekrut kandidat yang diajukan
lewat jalur lain selama **12 bulan** sejak kandidat diajukan.

Sistem harus:

1. Mencatat `submitted_at` pada setiap `submissions` — **tidak pernah diubah**.
2. Menghitung `protection_until = submitted_at + agreement.protection_months` per
   pasangan (kandidat, klien), memakai pengajuan **paling awal**.
3. Menyediakan **ekspor bukti** berformat PDF untuk satu pasangan (kandidat, klien):
   kapan diajukan, oleh siapa, CV versi mana yang dikirim, kapan klien membukanya di
   portal, dan riwayat tahapannya. Ini dokumen yang dilampirkan bila terjadi sengketa.
4. Memberi peringatan saat mengajukan kandidat ke klien yang sama dalam masa proteksi
   yang masih berjalan — bukan memblokir, hanya memperingatkan.

### 5.6 Pencegahan duplikat

- `UNIQUE (job_id, candidate_id)` — satu kandidat tidak bisa diajukan dua kali ke
  lowongan yang sama.
- Saat membuat kandidat baru, cek nomor telepon dan email terhadap basis data.
  Kemiripan nama saja tidak cukup — tampilkan kandidat serupa, biar manusia yang
  memutuskan gabung atau buat baru.
- Bila dua perekrut mengajukan kandidat yang sama ke klien berbeda, tidak masalah.
  Bila ke klien yang sama, yang pertama `submitted_at` yang memiliki.

### 5.7 Yang tidak boleh dilakukan sistem

- Tidak pernah mengubah `submitted_at`.
- Tidak pernah menghapus keras `submissions`, `placements`, atau `invoices`.
- Tidak pernah menolak kandidat secara otomatis berdasarkan skor AI (§7, §9).
- Tidak pernah menampilkan `current_salary` kandidat ke `client_viewer`.
- Tidak pernah menampilkan nilai fee atau tagihan ke peran `recruiter`.

---

## 6. Alur kerja inti

### 6.1 Tahapan pipeline

Nilai enum `submissions.stage`, berurutan:

| # | Stage | Arti | Catatan |
|---|---|---|---|
| 1 | `sourced` | Kandidat dikaitkan ke lowongan | Belum dihubungi |
| 2 | `screened` | Lolos penyaringan awal | Gaji dan lokasi sudah dicek |
| 3 | `interviewed_internal` | Sudah diwawancara tim kami | Wajib sebelum diajukan |
| 4 | `submitted_to_client` | **Diajukan ke klien** | **Stempel waktu bernilai hukum** |
| 5 | `client_interview` | Klien menjadwalkan wawancara | |
| 6 | `offer` | Klien memberi penawaran | |
| 7 | `signed` | Kandidat menandatangani kontrak | **Memicu tagihan pertama** |
| 8 | `started` | Kandidat mulai bekerja | **Memicu hitungan garansi** |
| 9 | `guarantee_passed` | Lulus masa percobaan | **Memicu tagihan kedua** |

Tahap terminal: `rejected` (dengan `rejected_by`: `us` atau `client`, plus alasan) dan
`withdrawn` (kandidat mundur).

Aturan transisi:
- Maju hanya boleh satu tahap, kecuali `owner` yang boleh melompat dengan alasan.
- Mundur diperbolehkan, tapi selalu tercatat di `submission_events`.
- **Setiap perpindahan menulis satu baris `submission_events`** dengan
  `from_stage`, `to_stage`, `occurred_at`, `actor_user_id`, dan catatan opsional.
  Dari tabel inilah seluruh metrik dihitung — jangan hitung metrik dari kolom `stage`
  saja.

### 6.2 Dari lowongan sampai tagihan

```
Klien menyampaikan kebutuhan
   ↓ buat client (bila baru) + client_agreement + job
Isi job, termasuk reason_previous_failed          ← field paling bernilai, lihat §6.3
   ↓
Cari kandidat: basis data internal + unggah CV baru
   ↓ AI ekstraksi CV → manusia konfirmasi
Buat submissions (stage: sourced)
   ↓ AI skor kecocokan → advisory saja
Screening → wawancara internal
   ↓
submitted_to_client  ← stempel waktu proteksi 12 bulan dimulai
   ↓ klien lihat di portal (tercatat client_viewed_at)
client_interview → offer → signed
   ↓ buat placement → dua invoice draft otomatis
started  ← guarantee_end_date dihitung
   ↓ 90 hari
guarantee_passed → tagihan kedua boleh dikirim
```

### 6.3 Field `reason_previous_failed`

Pada tabel `jobs`, kolom teks: *"Apa yang membuat kandidat sebelumnya tidak cocok atau
tidak jadi masuk?"*

Ini bukan field pelengkap. Jawabannya memberi tahu apa yang sebenarnya dicari klien —
sering berbeda dari deskripsi jabatan tertulis. Field ini juga menjadi masukan untuk
prompt penilaian AI (§7.2).

Tandai sebagai **wajib** saat lowongan berpindah dari `draft` ke `open`.

---

## 7. Fitur AI

Tiga fitur. Semuanya **membantu manusia, tidak menggantikan keputusan manusia.**

### 7.1 Ekstraksi CV

Masukan: berkas PDF atau DOCX.
Keluaran: JSON terstruktur — nama, telepon, email, domisili, perusahaan terakhir,
jabatan terakhir, total tahun pengalaman, pendidikan, daftar keahlian, gaji saat ini
(bila tertulis), riwayat kerja ringkas.

Alur wajib:
1. Simpan berkas ke penyimpanan objek, buat baris `candidate_documents`.
2. Panggil model, simpan hasil mentah ke `cv_extractions.raw_json`.
3. Tampilkan form terisi di sebelah pratinjau CV, **manusia mengoreksi dan menekan
   Konfirmasi**.
4. Baru setelah itu field `candidates` terisi, dan `cv_extractions.confirmed_by` +
   `confirmed_at` tercatat.

Jangan pernah menulis langsung ke `candidates` dari keluaran model.

Pakai model murah untuk tugas ini — ini pekerjaan ekstraksi, bukan penalaran.

### 7.2 Skor kecocokan kandidat–lowongan

Masukan: `jobs.must_have`, `jobs.nice_to_have`, `jobs.salary_min/max`,
`jobs.reason_previous_failed`, `jobs.location`, dan profil kandidat.

Keluaran, disimpan di `submissions`:
- `ai_match_score` — bilangan bulat 0–100
- `ai_match_reasoning` — JSON: `{ kekuatan: [], kesenjangan: [], risiko: [], catatan_gaji: "" }`

Aturan tampilan:
- Skor ditampilkan sebagai **saran**, dengan label yang jelas bahwa ini keluaran AI.
- **Tidak ada penyaringan otomatis.** Sistem tidak boleh menyembunyikan atau menolak
  kandidat berdasarkan skor. Perekrut boleh mengurutkan berdasarkan skor, tapi semua
  kandidat tetap terlihat.
- Kesenjangan gaji harus disorot khusus: bila `expected_salary > salary_max`, tandai
  merah. Ini penyebab kegagalan penempatan nomor satu.

Pakai model yang lebih kuat di sini — ini penalaran.

### 7.3 Pembuat pertanyaan penyaringan

Dari `must_have` + `reason_previous_failed`, hasilkan 5 pertanyaan untuk wawancara
telepon awal. Sekali klik, hasilnya bisa disunting dan disimpan ke lowongan.

Fitur paling murah untuk dibangun, dan yang paling sering dipakai sehari-hari.

### 7.4 Batasan yang tidak boleh dilanggar

- Isi CV dikirim ke penyedia AI pihak ketiga. **Ini wajib disebut dalam pemberitahuan
  persetujuan kandidat** (§9).
- Simpan biaya per panggilan (`cv_extractions.cost_idr`) supaya biaya AI terlihat,
  bukan menjadi kejutan di akhir bulan.
- Bila panggilan AI gagal, alur harus tetap jalan secara manual. AI tidak boleh
  menjadi titik kegagalan tunggal.

---

## 8. Portal klien

Rute terpisah `/portal`, tata letak berbeda, tanpa navigasi internal.

**Yang klien lihat:**
- Daftar lowongan miliknya sendiri, dengan jumlah kandidat per tahap
- Untuk tiap kandidat yang sudah `submitted_to_client` ke atas: nama, ringkasan
  profil, `expected_salary`, tahun pengalaman, berkas CV, tahap saat ini
- Riwayat tahapan kandidat tersebut (tanggal saja, tanpa catatan internal)

**Yang klien TIDAK boleh lihat:**
- Kandidat pada tahap sebelum `submitted_to_client`
- `current_salary` kandidat
- Catatan internal, `ai_match_score`, `ai_match_reasoning`
- Klien lain, lowongan lain, kandidat yang diajukan ke klien lain
- Apa pun terkait fee, tagihan, atau perjanjian

**Yang klien bisa lakukan:**
- Menandai kandidat: `tertarik` / `tidak tertarik` / `minta jadwal wawancara`
- Menulis umpan balik teks per kandidat
- Mengunduh CV

**Yang wajib dicatat sistem:**
- `submissions.client_viewed_at` pada tampilan pertama — ini bagian dari berkas bukti
  di §5.5
- Setiap umpan balik masuk ke `activities` dengan penanda sumber portal

Keamanan: token magic link disimpan **ter-hash**, bukan teks polos. Setiap permintaan
portal memfilter berdasarkan `client_id` dari sesi — jangan pernah mengandalkan
parameter URL untuk menentukan kepemilikan data.

---

## 9. Kewajiban UU PDP

UU No. 27 Tahun 2022 berlaku penuh sejak Oktober 2024. Sanksi administratif sampai
**2% pendapatan tahunan**. Sistem yang menyimpan basis data kandidat adalah pengendali
data pribadi.

Yang wajib ada di versi pertama:

### 9.1 Catatan persetujuan
Tabel `candidate_consents`. Setiap kandidat harus punya minimal satu baris sebelum
datanya boleh dipakai untuk pengajuan ke klien.

Isi minimal: tujuan pemrosesan, kapan diberikan, lewat saluran apa (form daring,
WhatsApp, email, kertas), bukti (tangkapan layar atau teks persetujuan), dan
`retention_until`.

Teks pemberitahuan wajib menyebut: data dipakai untuk rekrutmen, **dibagikan kepada
perusahaan klien yang dilamar**, **diproses dengan bantuan layanan AI pihak ketiga**,
disimpan selama 24 bulan sejak aktivitas terakhir, dan bisa ditarik kapan saja.

### 9.2 Hak subjek data
Sediakan layar `owner` untuk memenuhi permintaan kandidat:
- **Akses** — ekspor seluruh data kandidat sebagai JSON atau PDF
- **Koreksi** — sunting biasa, sudah tercakup
- **Penghapusan** — anonimkan `candidates` (nama, telepon, email, NIK diganti nilai
  acak), hapus berkas dokumen, **tapi pertahankan baris `submissions` dan `placements`
  dalam bentuk teranonimkan** karena keduanya adalah catatan keuangan dan bukti
  perjanjian. Catat permintaannya.
- **Penarikan persetujuan** — set `withdrawn_at`, kandidat otomatis keluar dari
  pencarian dan tidak bisa diajukan lagi

### 9.3 Retensi
`retention_until` default 24 bulan sejak aktivitas terakhir. Sediakan tugas terjadwal
yang **melaporkan** kandidat yang melewati batas — jangan langsung menghapus otomatis
di versi pertama. Pemilik yang memutuskan.

### 9.4 Jejak audit
Setiap akses ke data kandidat oleh `client_viewer`, dan setiap ekspor data, tercatat.
Bila terjadi kebocoran, kewajiban pemberitahuan adalah **3×24 jam** — tanpa jejak
audit, mustahil tahu data siapa yang terdampak.

### 9.5 Data yang sebaiknya tidak disimpan
NIK, foto, status pernikahan, agama, dan nomor rekening **tidak diperlukan** untuk
proses rekrutmen sampai tahap penawaran. Jangan sediakan field-nya di versi pertama.
Data yang tidak disimpan tidak bisa bocor.

---

## 10. Tumpukan teknologi

| Lapisan | Pilihan | Catatan |
|---|---|---|
| Framework | Next.js (App Router), TypeScript | |
| Basis data | **Postgres via Neon di Vercel Marketplace** | Vercel Postgres sudah dihentikan Juni 2025 dan dimigrasikan ke Neon. Jangan pakai paket `@vercel/postgres` yang lama. |
| ORM | Drizzle | Migrasi berbasis berkas, cocok untuk skema di `docs/schema.sql` |
| Autentikasi | Auth.js (NextAuth) — kredensial untuk staf, email/magic link untuk klien | |
| Penyimpanan berkas | Vercel Blob | CV, dokumen. Jangan simpan berkas di basis data. |
| UI | Tailwind + shadcn/ui | |
| Validasi | Zod di batas server action | |
| Email | Resend | Magic link + pemberitahuan |
| AI | Panggilan API model, abstraksi di satu modul `lib/ai/` | Supaya penyedia bisa diganti tanpa menyentuh fitur |
| Hosting | Vercel | |
| Zona waktu | `Asia/Jakarta` untuk semua tampilan | Simpan `TIMESTAMPTZ` |
| Mata uang | IDR, `BIGINT` rupiah penuh | Format tampilan `Rp1.234.567` |

Biaya bulanan yang diharapkan pada volume tahun pertama: **Rp0–150 ribu**, sebagian
besar dari panggilan AI. Bila melewati Rp300 ribu per bulan, ada yang salah — periksa
apakah ekstraksi dipanggil berulang untuk dokumen yang sama.

---

## 11. Urutan pembangunan

Bangun berurutan. Setiap fase harus bisa dipakai sebelum fase berikutnya dimulai.

### Fase 0 — Fondasi
Proyek Next.js, Neon Postgres tersambung, Drizzle + migrasi dari `docs/schema.sql`,
Auth.js dengan peran `owner`/`recruiter`, tata letak dasar, penyemaian satu akun owner.
**Selesai bila:** bisa login, melihat dasbor kosong, dan menjalankan migrasi bersih.

### Fase 1 — Data induk
CRUD `clients`, `client_agreements`, `jobs`, `candidates`. Unggah CV ke Vercel Blob.
Pencarian dan penyaringan kandidat.
**Selesai bila:** bisa memasukkan seluruh isi Formulir Pencatatan Kebutuhan Klien dari
Paket Dokumen Tahap 1 tanpa field yang hilang.

### Fase 2 — Pipeline
`submissions`, papan tahapan, `submission_events` pada setiap perpindahan, pencegahan
duplikat, peringatan masa proteksi.
**Selesai bila:** satu kandidat bisa berjalan dari `sourced` sampai `signed`, dan
riwayat perpindahannya lengkap di `submission_events`.

### Fase 3 — Uang
`placements`, perhitungan fee, dua tagihan otomatis, PPh 23 dan PPN, pelacakan garansi,
alur penggantian, ekspor bukti proteksi kandidat (§5.5).
**Selesai bila:** membuat satu penempatan menghasilkan dua tagihan dengan jumlah yang
persis sama dengan `fee_amount`, dan tagihan kedua terkunci sampai garansi lewat.

> **Fase 3 sebelum Fase 4.** Godaan terbesar adalah membangun AI lebih dulu karena
> lebih menyenangkan. Tapi AI menghemat waktu, sedangkan Fase 3 yang menghasilkan dan
> menjaga uang. Sistem tanpa AI masih berguna; sistem tanpa pelacakan tagihan tidak.

### Fase 4 — AI
Ekstraksi CV dengan konfirmasi manusia, skor kecocokan, pembuat pertanyaan penyaringan,
pelacakan biaya.
**Selesai bila:** mengunggah satu CV mengisi form yang bisa dikoreksi, dan skor
kecocokan muncul dengan alasan yang masuk akal — tanpa satu pun kandidat tersaring
otomatis.

### Fase 5 — Portal klien
Magic link, tampilan terbatas, umpan balik, pencatatan `client_viewed_at`.
**Selesai bila:** klien uji coba hanya bisa melihat lowongan dan kandidatnya sendiri,
dibuktikan dengan mencoba mengakses ID milik klien lain lewat URL.

### Fase 6 — Komunikasi dan laporan
Template pesan WhatsApp (`wa.me` dengan teks terisi — **tanpa API berbayar**), template
email lewat Resend, dasbor: pipeline per tahap, waktu rata-rata pengisian, tagihan
jatuh tempo, garansi yang akan berakhir, biaya AI bulan berjalan.

### Fase 7 — Kepatuhan PDP
Layar persetujuan, ekspor data kandidat, alur penghapusan, laporan retensi, jejak audit.

> Fase 7 di akhir daftar tapi **tabel `candidate_consents` harus sudah ada sejak
> Fase 0**, dan pemberitahuan persetujuan harus tampil di form kandidat sejak Fase 1.
> Yang ditunda hanyalah layar pengelolaannya, bukan pencatatannya.

---

## 12. Metrik yang harus ditampilkan dasbor

Semua dihitung dari `submission_events`, bukan dari kolom `stage`.

| Metrik | Rumus | Kenapa penting |
|---|---|---|
| Pipeline per tahap | Jumlah `submissions` aktif per `stage` | Gambaran harian |
| Rasio ajuan → wawancara | `client_interview` ÷ `submitted_to_client` | Mengukur kualitas penyaringan. Di bawah 30% berarti Anda mengirim kandidat yang salah. |
| Rasio ajuan → penempatan | `signed` ÷ `submitted_to_client` | Target sehat 15–25% |
| Waktu pengisian | Rata-rata hari `job.opened_at` → `signed` | Untuk menjanjikan tenggat yang realistis ke klien |
| Tagihan jatuh tempo | `invoices` status `sent` dengan `due_date` lewat | Uang yang belum masuk |
| Garansi akan berakhir | `placements` dengan `guarantee_end_date` dalam 14 hari | Pengingat menagih tagihan kedua |
| Penempatan bulan ini | Jumlah `placements` dengan `start_date` bulan berjalan | Terhadap target impas 1 per bulan |
| Biaya AI bulan berjalan | Jumlah `cv_extractions.cost_idr` | Supaya biaya tidak diam-diam membengkak |

Target impas dari model keuangan: **0,7–0,9 penempatan per bulan** menutup seluruh
biaya tetap. Tampilkan garis target ini di kartu penempatan bulan ini.

---

## 13. Yang sengaja tidak dibangun

Daftar ini sama pentingnya dengan daftar fitur. Bila Claude Code mengusulkan salah satu
di bawah, jawabannya tidak.

- Modul alih daya, absensi, payroll, BPJS, PPh 21
- Job portal publik atau halaman karier
- Integrasi API WhatsApp Business berbayar — cukup tautan `wa.me`
- Penjadwalan wawancara dengan sinkronisasi kalender
- Penilaian atau tes daring untuk kandidat
- Aplikasi seluler — cukup web responsif
- Multi-tenant atau multi-perusahaan
- Multi bahasa — Indonesia saja
- Impor massal kandidat dari LinkedIn (melanggar ketentuan layanan mereka)
- Penolakan kandidat otomatis berdasarkan skor apa pun

---

## 14. Berkas pendamping

| Berkas | Isi |
|---|---|
| `docs/schema.sql` | Skema Postgres lengkap dengan constraint dan indeks |
| `CLAUDE.md` | Aturan main untuk sesi Claude Code — baca lebih dulu |

---

## 15. Rujukan bisnis

Aturan di §5 berasal dari **Paket Dokumen Komersial Tahap 1**, Bagian 4 (Template
Penawaran Jasa Rekrutmen) dan Bagian 5 (Draf Perjanjian Jasa Rekrutmen). Bila ketentuan
komersial di dokumen itu berubah setelah ditinjau penasihat hukum, §5 di sini harus
ikut diperbarui **sebelum** kode disesuaikan.

Angka target di §12 berasal dari **Financial Model v2.0**, sheet BEP dan Headhunter.
