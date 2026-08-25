# Modul Headhunter — PT HR & Workforce Solutions

Sistem manajemen rekrutmen. Kebenaran produk ada di [`SPEC.md`](SPEC.md); aturan
kerja untuk sesi Claude Code ada di [`CLAUDE.md`](CLAUDE.md).

**Status: Fase 1 (Data induk) selesai.** Berikutnya Fase 2 (Pipeline).

---

## Apa yang sudah bisa dipakai

| Bisa | Belum |
|---|---|
| Masuk dengan email + kata sandi | Mengaitkan kandidat ke lowongan |
| Peran `owner` dan `recruiter` beserta pembatasannya | Papan tahapan dan jejak perpindahannya |
| Klien, perjanjian jasa rekrutmen, lowongan, kandidat | Penempatan, fee, tagihan |
| Pencarian dan penyaringan kandidat | Portal klien, fitur AI |
| Catatan persetujuan data pribadi di setiap kandidat | Layar pengelolaan hak subjek data |
| Unggah CV ke Vercel Blob | |

Menu Pipeline, Penempatan, dan Tagihan sudah terlihat di bagian atas layar tapi
belum bisa diklik — itu memang belum dibangun.

### Cara mencobanya

1. Buka **Klien → Tambah klien**, isi nama perusahaan dan PIC-nya.
2. Di halaman klien itu, klik **Tambah perjanjian**. Isi persentase fee — coba
   isi `5` dulu untuk melihat sistem menolaknya, lalu isi `15`.
3. Klik **Tambah lowongan**. Ubah statusnya ke **Terbuka** tanpa mengisi *"apa yang
   membuat kandidat sebelumnya tidak cocok"* — sistem akan menahan Anda. Isi
   jawabannya, lalu simpan.
4. Buka **Kandidat → Tambah kandidat**. Baca dulu kotak biru di atas: itu yang
   wajib disampaikan ke kandidat sebelum datanya dimasukkan.
5. Setelah tersimpan, coba tambah kandidat lain dengan nomor telepon yang sama
   tapi ditulis `+62…`. Sistem akan mengenalinya sebagai orang yang sama.
6. Coba juga nama yang mirip dengan kandidat yang sudah ada — sistem hanya
   memperingatkan, dan Anda yang memutuskan.

Untuk melihat pembatasan peran: buat akun perekrut (lihat perintah `user:tambah`
di bawah), masuk dengan akun itu, lalu buka halaman klien. Bagian perjanjian dan
menu Tagihan tidak akan ada di sana.

---

## Menjalankan di komputer sendiri

Perlu Node.js 22 ke atas dan satu basis data Postgres.

```bash
npm install                       # sekali saja
cp .env.example .env.local        # lalu isi nilainya, lihat penjelasan di dalamnya
npm run db:migrate                # membuat seluruh tabel
npm run db:seed                   # membuat akun pemilik pertama
npm run dev                       # buka http://localhost:3000
```

Masuk dengan email dan kata sandi yang Anda tulis di `OWNER_EMAIL` dan
`OWNER_PASSWORD`.

---

## Perintah yang tersedia

| Perintah | Gunanya |
|---|---|
| `npm run dev` | Menjalankan aplikasi untuk dicoba di komputer sendiri |
| `npm run db:migrate` | Membuat atau memperbarui tabel. Aman diulang. |
| `npm run db:seed` | Membuat akun pemilik. Tidak menimpa akun yang sudah ada. |
| `npm run db:test-rules` | Menjalankan 10 uji aturan bisnis. **Jalankan setiap kali skema disentuh.** |
| `npm run test` | Menjalankan uji perhitungan |
| `npm run typecheck` | Memeriksa kesalahan ketik di seluruh kode |
| `npm run build` | Menyiapkan versi produksi |

Menambah akun perekrut saat nanti merekrut orang:

```bash
KATA_SANDI='kata sandi minimal 12 huruf' \
  npm run user:tambah -- --email=budi@perusahaan.co.id --nama="Budi" --peran=recruiter
```

---

## Menaruhnya di internet (Vercel)

Tidak perlu terminal sama sekali.

1. Di Vercel, buat proyek baru dari repositori ini. Penempatan pertama akan
   berhasil walau belum ada apa-apa — yang muncul adalah halaman **Persiapan**
   yang menyebutkan apa saja yang masih kosong.
2. Buka tab **Storage** → **Neon Postgres** dari Marketplace → sambungkan ke
   proyek ini. Vercel mengisi `DATABASE_URL` sendiri.
3. Buka **Settings → Environment Variables**, tambahkan:
   - `AUTH_SECRET` — teks acak minimal 32 karakter
   - `OWNER_EMAIL` dan `OWNER_PASSWORD` — akun pertama Anda (sandi minimal 12 karakter)
   - `OWNER_NAME` dan `COMPANY_LEGAL_NAME` — opsional
4. Jalankan **Redeploy** sekali.

Pada penempatan itu, pembuatan seluruh tabel dan akun pemilik pertama berjalan
sendiri, lalu halaman Persiapan hilang dan halaman masuk yang tampil.

**Kenapa migrasi dijalankan otomatis saat penempatan.** Biasanya perubahan basis
data produksi sebaiknya dijalankan manual. Tapi pemilik sistem ini bukan
programmer, dan pembuatan tabel yang menuntut satu perintah baris perintah
berarti sistemnya tidak akan pernah benar-benar jalan. Yang dijalankan tetap
migrasi berbasis berkas yang sudah di-commit dan diuji — bukan `db push`, yang
memang dilarang. Bila migrasinya gagal, penempatan ikut gagal terang-terangan,
bukan diam-diam menempatkan aplikasi di atas basis data yang tidak sesuai.

---

## Susunan berkas

```
app/                 halaman dan server action
  masuk/             halaman masuk
  (internal)/        halaman untuk staf, sudah dipagari pemeriksaan sesi
components/ui/       elemen antarmuka dasar
lib/
  db/schema.ts       cerminan TypeScript dari docs/schema.sql
  db/queries/        query Drizzle, dikelompokkan per entitas
  validation/        skema Zod, satu berkas per entitas
  auth.ts            pemeriksaan email + kata sandi
  auth.config.ts     aturan "siapa boleh buka halaman mana"
  format.ts          tampilan rupiah dan waktu Asia/Jakarta
drizzle/0000_init.sql  salinan persis docs/schema.sql
  rules/             aturan bisnis murni: uang, tanggal, deteksi kembar
  pdp.ts             teks pemberitahuan persetujuan, dengan nomor versi
  audit.ts           pencatatan akses data pribadi
  storage.ts         unggah/unduh dokumen ke Vercel Blob
docs/
  schema.sql                  skema basis data — sumber kebenaran
  test_rules.sql              10 uji aturan bisnis
  CATATAN-TEMUAN.md           hal yang perlu keputusan pemilik
  FORMULIR-KEBUTUHAN-KLIEN.md bagian formulir yang belum ada rujukannya
scripts/             perintah baris perintah
proxy.ts             pemeriksaan sesi sebelum tiap halaman
```

---

## Hal yang sengaja dijaga

- **Uang tidak pernah lewat `number` JavaScript.** Semua nilai rupiah bertipe
  `bigint`, dan perhitungan yang menghasilkan nilai tersimpan dilakukan Postgres.
- **`drizzle/0000_init.sql` wajib sama persis dengan `docs/schema.sql`.** Perintah
  migrasi menolak jalan bila keduanya berbeda, supaya skema yang diuji dan skema
  yang dijalankan tidak pernah menyimpang.
- **Tanggal bisnis tidak pernah lewat `new Date()`.** Kolom `DATE` dibaca sebagai
  teks `YYYY-MM-DD` supaya tanggal tidak bergeser sehari karena zona waktu.
- **Perekrut tidak melihat menu Penempatan dan Tagihan.** Dipagari di lapisan
  tata letak, bukan sekadar disembunyikan dengan CSS.
