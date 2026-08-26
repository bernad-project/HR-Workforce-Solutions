# Arahan pemilik — 26 Agustus 2026

Tiga arahan produk dari pemilik setelah mencoba Fase 0 dan Fase 1. Dicatat apa
adanya lebih dulu, lalu diperiksa terhadap aturan di `CLAUDE.md` dan `SPEC.md`.

Dua di antaranya bertabrakan dengan aturan yang tidak boleh dilanggar. Sesuai
`CLAUDE.md` ("Bila sebuah permintaan bertentangan… hentikan dan tanyakan ke
pemilik"), keduanya menunggu keputusan sebelum dikerjakan.

---

## 1. AI mempercepat penyaringan — dari berhari-hari jadi beberapa jam

**Yang diminta.** Perekrut memilih kandidat berdasarkan hasil penyaringan AI,
supaya mencari kandidat yang cocok tidak makan waktu berhari-hari.

**Tidak bertabrakan.** Selama yang memilih tetap manusia, ini persis yang
dirancang di `SPEC.md` §7.2: AI memberi skor 0–100 beserta alasannya
(kekuatan, kesenjangan, risiko, catatan gaji), perekrut mengurutkan berdasarkan
skor, lalu memutuskan sendiri.

**Batas yang tetap berlaku** (`CLAUDE.md` poin 5, kewajiban UU PDP soal hak
menolak profiling otomatis):

- Tidak ada kandidat yang ditolak otomatis karena skornya rendah.
- Tidak ada kandidat yang disembunyikan dari daftar karena skornya rendah.
- Skor selalu diberi label sebagai keluaran AI, bukan penilaian final.

Mengurutkan berdasarkan skor: boleh. Menyaring keluar: tidak.

**Catatan urutan pembangunan.** Ini Fase 4. Selain karena `CLAUDE.md` melarang
memulainya sebelum Fase 3 selesai dan dipakai, ada alasan teknis yang lebih
mengikat: skor kecocokan disimpan di kolom `submissions.ai_match_score`. Tabel
`submissions` baru lahir di Fase 2. **Sebelum Fase 2 ada, tidak ada tempat untuk
menyimpan skornya.**

---

## 2. Dua jalur pengisian kandidat

**Yang diminta.** Kandidat masuk lewat dua jalur: (a) diisi sendiri oleh
kandidat, dan (b) hasil pencarian internal di media sosial seperti LinkedIn —
lebih baik lagi kalau bisa dikaitkan dan langsung di-generate.

### (a) Kandidat mengisi sendiri — bisa dikerjakan

Bukan job portal publik, jadi tidak bertabrakan dengan `SPEC.md` §13. Yang perlu
disiapkan:

- Satu halaman yang bisa dibuka tanpa login. Ini permukaan keamanan baru dan
  butuh pembatasan laju supaya tidak dibanjiri isian sampah.
- Persetujuan PDP diambil langsung dari kandidatnya sendiri. Ini **lebih kuat**
  daripada persetujuan yang dicatatkan perekrut, karena buktinya berasal dari
  orang yang bersangkutan.
- Isian masuk sebagai antrean tinjauan, bukan langsung ke basis data kandidat.

### (b) Menarik dari LinkedIn — BERTABRAKAN

`SPEC.md` §13 dan `CLAUDE.md` sama-sama menyebutnya sebagai hal yang sengaja
tidak dibangun, dengan alasan: **melanggar ketentuan layanan LinkedIn.**

Ada alasan kedua yang lebih mengikat, dan tidak disebut di kedua dokumen itu:

> Mengambil data seseorang dari LinkedIn berarti kita menyimpan data pribadi
> tanpa dasar persetujuan. Padahal sistem ini mewajibkan adanya catatan
> persetujuan sebelum kandidat boleh diajukan ke klien. Jadi baris yang lahir
> dari penarikan otomatis **tetap tidak bisa dipakai** sampai kandidatnya
> dihubungi dan setuju. Otomatisasinya tidak menghemat langkah yang menentukan.

**Jalan yang aman dan hampir sama cepatnya:** perekrut menyalin teks profil dari
layar, menempelkannya ke satu kotak di form kandidat, lalu AI merapikannya jadi
isian yang tinggal dikoreksi. Hitungan detik, tidak menyentuh sistem LinkedIn,
dan gerbang persetujuan tetap utuh.

**Status: menunggu keputusan pemilik.**

---

## 3. Klien melihat talent pool yang sesuai lowongannya

**Yang diminta.** Di portal, klien memilih satu lowongan lalu langsung melihat
rangkuman siapa saja yang direkomendasikan untuk lowongan itu.

**Sebagian bertabrakan.**

Bagian "pilih lowongan → lihat rangkuman kandidatnya" memang sudah dirancang di
`SPEC.md` §8 dan akan dibangun di Fase 5. Yang bertabrakan adalah kata **talent
pool**: bila yang dimaksud seluruh kandidat di basis data yang cocok dengan
lowongan itu, `CLAUDE.md` poin 7 dan `SPEC.md` §8 melarangnya. Klien hanya boleh
melihat kandidat yang **sudah diajukan** ke lowongannya (tahap
`submitted_to_client` ke atas).

**Kenapa larangan itu ada — ini soal uang, bukan soal privasi saja:**

> Klausul proteksi 12 bulan hanya menggigit untuk kandidat yang **Anda ajukan**,
> dengan stempel waktu sebagai buktinya. Kandidat yang cuma dilihat klien di
> daftar tidak punya stempel itu. Kalau klien bisa menelusuri seluruh talent
> pool, ia bisa mencatat nama-namanya lalu menghubungi mereka langsung — dan
> Anda tidak punya dasar apa pun untuk menagih fee. Anda menyerahkan aset paling
> berharga secara gratis.

Satu larangan lagi yang menempel: skor AI **tidak pernah** ditampilkan ke klien
(`CLAUDE.md` poin 7). Kalau klien melihat "kandidat ini 87, yang itu 62", ia
akan memperlakukannya sebagai janji, dan setiap penempatan yang gagal jadi
sengketa.

**Jalan yang memberi pengalaman sama bagi klien, tanpa membuka pool:** perekrut
memilih shortlist dan mengajukannya — tindakan itulah yang menstempel proteksi
12 bulan. Klien lalu membuka lowongannya dan melihat persis shortlist itu,
sudah dirangkum: nama, ringkasan profil, ekspektasi gaji, tahun pengalaman, CV,
dan tahap saat ini. Dari sisi klien tampilannya sama; bedanya, pendapatan Anda
terlindungi.

**Status: menunggu keputusan pemilik.**

---

## Ringkasan status

| Arahan | Status |
|---|---|
| 1. AI mempercepat penyaringan | Diterima. Dikerjakan di Fase 4, setelah Fase 2 dan 3. |
| 2a. Kandidat mengisi sendiri | Diterima. Dijadwalkan bersama Fase 5. |
| 2b. Menarik dari LinkedIn | **Menunggu keputusan.** Bertabrakan dengan SPEC §13. |
| 3. Klien melihat talent pool | **Menunggu keputusan.** Bertabrakan dengan CLAUDE.md poin 7. |
