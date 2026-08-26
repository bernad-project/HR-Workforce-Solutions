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

**Keputusan pemilik (26 Agu 2026): tidak jadi dihubungkan ke LinkedIn.**
Jalur tempel-teks yang dirapikan AI yang dipakai, dikerjakan bersama Fase 4.

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

**Keputusan pemilik (26 Agu 2026): identitas kandidat tidak boleh terlihat.**
Yang dibutuhkan klien adalah kepastian bahwa sistem ini berguna baginya, bukan
daftar nama. Lihat bagian berikut.

---

## 3b. Kartu buta — cara menunjukkan nilai tanpa menyerahkan aset

Pemilik menambahkan satu kebutuhan yang tidak ada di SPEC: klien perlu yakin
lebih dulu bahwa sistem ini berguna baginya, bukan hanya menghabiskan waktu.

**Yang sudah diizinkan SPEC §8 dan sering diremehkan:** klien boleh melihat
*jumlah kandidat per tahap* di lowongannya sendiri. Itu saja sudah menjawab
"apakah ada yang dikerjakan untuk saya" — misalnya "5 sedang disaring, 2 sudah
diwawancara tim". Tidak ada satu pun nama yang bocor.

**Tambahan yang diusulkan — kartu buta.** Untuk kandidat yang **belum** diajukan,
klien melihat kartu tanpa identitas sama sekali:

> Kandidat B · 6 tahun pengalaman · penjualan B2B · Bekasi ·
> ekspektasi Rp8–10 juta · bisa mulai dalam 30 hari

Untuk melihat siapa orangnya, perekrut harus **mengajukannya** — dan tindakan
itulah yang menstempel proteksi 12 bulan. Jadi rasa ingin tahu klien justru
mendorong alur yang melindungi pendapatan, bukan mengikisnya.

**Aturan anonimisasi yang wajib, supaya kartunya benar-benar buta:**

| Ditampilkan | Tidak pernah ditampilkan |
|---|---|
| Tahun pengalaman, dibulatkan | Nama, telepon, email |
| Bidang keahlian (2–3 kata) | Nama perusahaan sekarang |
| Kota domisili, bukan kecamatan | Jabatan persis sekarang |
| Ekspektasi gaji dalam rentang | Gaji sekarang, CV, skor AI |
| Kesiapan mulai, dibulatkan | Pendidikan spesifik (nama kampus) |

Alasan kolom kanan: di pasar kerja yang sempit, "Sales Manager di PT X, 6 tahun,
Bekasi" cukup untuk menebak orangnya. Kalau kartunya bisa ditebak, ia bukan
anonim — dan seluruh perlindungannya runtuh.

**Ini perubahan pada SPEC §8**, yang semula melarang klien melihat apa pun
sebelum tahap `submitted_to_client`. Perubahan disetujui pemilik dengan syarat
aturan anonimisasi di atas ditegakkan di lapisan query, bukan di tampilan.

Dikerjakan di Fase 5.

---

## Ringkasan status

| Arahan | Status |
|---|---|
| 1. AI mempercepat penyaringan | Diterima. Fase 4, setelah Fase 2 dan 3. |
| 2a. Kandidat mengisi sendiri | Diterima. Bersama Fase 5. |
| 2b. Menarik dari LinkedIn | **Dibatalkan pemilik.** Diganti tempel-teks + AI. |
| 3. Klien melihat talent pool | **Diubah.** Kartu buta tanpa identitas, Fase 5. |
| Enam kolom formulir normatif | **Selesai** bersama Fase 2, 26 Agu 2026. |
