# Formulir Pencatatan Kebutuhan Klien — apa yang saya karang sendiri

`SPEC.md` §11 menyebut Fase 1 selesai bila *"bisa memasukkan seluruh isi Formulir
Pencatatan Kebutuhan Klien dari Paket Dokumen Tahap 1 tanpa field yang hilang."*
Dokumen itu belum ada, jadi formulirnya saya susun dari `docs/schema.sql`, `SPEC.md`
§4, dan §6.3.

**Semua kotak isian di layar berasal dari kolom yang memang sudah ada di skema.**
Tidak ada kolom baru, tidak ada kolom yang saya lewati. Yang saya karang sendiri
adalah hal-hal di bawah ini — silakan dicoret atau diubah.

---

## 1. Pengelompokan dan urutan isian

Skema tidak menentukan urutan. Saya kelompokkan lowongan jadi empat bagian:

| Bagian | Isinya | Alasan saya menaruhnya begitu |
|---|---|---|
| Kebutuhan | Klien, jabatan, jumlah, lokasi, gaji, target mulai, status | Yang biasanya ditanyakan pertama saat klien menelepon |
| **Kenapa kandidat sebelumnya tidak cocok** | `reason_previous_failed`, "sudah kosong berapa lama" | Diberi kotak sendiri dan garis tebal. SPEC §6.3 menyebutnya field paling bernilai, tapi kalau diselipkan di tengah isian lain ia akan dilewati |
| Kriteria | Syarat wajib, nilai tambah | Dua kolom bersebelahan supaya mudah dibandingkan |
| Proses di sisi klien | Pengambil keputusan, pewawancara, pertanyaan penyaringan | Biasanya baru terjawab di pertemuan kedua |

**Bila formulir asli Anda punya urutan berbeda, sebutkan — memindahkannya mudah.**

## 2. Pilihan status hubungan kerja

Kolom `employment_type` di skema bertipe teks bebas. Saya isi pilihannya:

> Karyawan tetap · PKWT / kontrak · Harian lepas · Magang

Ini tebakan saya soal jenis yang akan Anda tangani. Kalau ada yang kurang atau ada
yang tidak pernah dipakai, sebutkan.

## 3. Teks pemberitahuan persetujuan data pribadi

SPEC §9.1 menyebut **apa** yang wajib disebut, bukan **bagaimana** kalimatnya.
Kalimatnya saya tulis sendiri, ada di `lib/pdp.ts`, versi `2026-08-v1`.

Lima poin yang tampil di layar sudah mencakup semua yang diwajibkan: dipakai untuk
rekrutmen, dibagikan ke perusahaan klien, diproses dengan bantuan AI pihak ketiga,
disimpan 24 bulan sejak aktivitas terakhir, dan bisa ditarik kapan saja. Poin ketiga
saya tambahi kalimat bahwa kandidat berhak menolak dinilai otomatis — itu hak yang
diberikan UU 27/2022 dan lebih baik disebut daripada tidak.

**Teks ini sebaiknya dibaca penasihat hukum sebelum dipakai ke kandidat sungguhan.**
Nomor versinya disimpan di setiap catatan persetujuan, jadi kalau teksnya nanti
direvisi, catatan lama tetap menunjuk ke teks yang benar-benar disetujui waktu itu.

## 4. Bukti persetujuan saya jadikan wajib

Di skema, kolom `evidence` boleh kosong. Saya buat wajib diisi, karena SPEC §9.1
menyebut bukti sebagai bagian dari isi minimal, dan catatan persetujuan tanpa bukti
tidak banyak menolong bila suatu hari ditanya.

Akibatnya: perekrut tidak bisa menyimpan kandidat sebelum menuliskan bukti
persetujuannya. **Kalau ini terasa terlalu ketat di lapangan, bilang** — batasannya
ada di satu tempat dan mudah dilonggarkan.

## 5. Nomor telepon diseragamkan sebelum disimpan

`+62 812-3456-7890`, `0812-3456-7890`, dan `62 812 3456 7890` semuanya disimpan
sebagai `081234567890`.

Alasannya: basis data menolak nomor yang sama persis, tapi tiga tulisan di atas
adalah tiga teks berbeda. Tanpa penyeragaman, orang yang sama bisa masuk dua kali,
lalu diajukan ke klien yang sama lewat dua baris berbeda — dan klaim proteksi 12
bulan jadi menunjuk ke dua tanggal.

## 6. Satu perjanjian berlaku per klien

Saat perjanjian baru dibuat, perjanjian lama klien itu ditandai tidak berlaku lagi
(tidak dihapus). SPEC tidak mengatur ini. Saya pilih begini supaya lowongan baru
punya satu bawaan yang jelas, sementara riwayat lama tetap utuh sebagai rujukan.

## 7. Perjanjian hanya bisa dibuka pemilik

CLAUDE.md poin 8 melarang peran `recruiter` melihat nilai fee. Perjanjian memuat
persentase fee, jadi seluruh bagiannya tidak ditampilkan ke perekrut — datanya bahkan
tidak diambil dari basis data, bukan sekadar disembunyikan di layar. Perekrut yang
mengetik alamat halaman perjanjian langsung akan dikembalikan ke halaman klien.

Akibat sampingannya: perekrut tidak bisa memilih perjanjian mana yang dipakai sebuah
lowongan. Sistem memilihkan perjanjian yang sedang berlaku. **Kalau Anda ingin
perekrut bisa memilih, itu berarti mereka melihat daftar perjanjian — dan itu perlu
persetujuan Anda karena bertentangan dengan CLAUDE.md poin 8.**

---

## Yang sengaja belum ada di formulir

- **Unggah berkas perjanjian** (kolom `client_agreements.file_key` sudah ada di
  skema, tapi layar unggahnya belum saya buat). Sebutkan kalau perlu.
- **Menghapus klien, lowongan, atau kandidat.** Skema memakai penghapusan lunak
  (`deleted_at`), tapi tombolnya belum ada. Saya menunggu Anda menentukan siapa yang
  boleh menghapus apa.
- **Menarik persetujuan kandidat.** Kolomnya (`withdrawn_at`) sudah ada; layarnya
  masuk Fase 7 sesuai SPEC.
