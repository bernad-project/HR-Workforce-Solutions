# Fase 2 selesai — cara mencobanya

Fase 2 adalah **pipeline**: mengaitkan kandidat ke lowongan, memindahkannya tahap demi
tahap, dan mencatat setiap perpindahan itu supaya tidak bisa hilang.

Tidak perlu membuka terminal. Semua langkah di bawah dilakukan lewat layar.

---

## Apa yang sekarang bisa dilakukan

Satu menu baru muncul di baris atas: **Pipeline**.

1. **Mengaitkan kandidat ke lowongan.** Buka sebuah lowongan, gulir ke bawah sampai
   kotak *"Kaitkan kandidat ke lowongan ini"*, cari namanya, klik **Kaitkan**.
2. **Memindahkan tahap.** Klik nama kandidat di tabel *"Kandidat di lowongan ini"*.
   Di halaman itu ada kotak **Pindahkan tahap**.
3. **Melihat riwayatnya.** Di halaman yang sama, paling atas, ada daftar setiap
   perpindahan: dari tahap apa ke tahap apa, kapan, oleh siapa, dan catatannya.
4. **Melihat semuanya sekaligus.** Menu **Pipeline** menampilkan seluruh kandidat yang
   sedang berjalan, dikelompokkan per tahap.

---

## Coba berurutan (kira-kira 10 menit)

### 1. Kaitkan satu kandidat

Buka **Lowongan** → pilih satu → gulir ke *"Kaitkan kandidat ke lowongan ini"* →
**Kaitkan**.

Yang perlu dilihat: kandidat itu langsung muncul di tabel di atasnya dengan tahap
**Dikaitkan**, dan namanya **hilang dari daftar pilihan**. Itu pencegahan duplikat —
satu kandidat tidak bisa dikaitkan dua kali ke lowongan yang sama.

### 2. Jalankan sampai tanda tangan

Klik namanya, lalu pindahkan tahap satu per satu:

```
Dikaitkan → Lolos saringan → Diwawancara tim kami → Diajukan ke klien
→ Wawancara klien → Ditawari → Tanda tangan
```

Isi kotak catatan sesekali, misalnya *"klien minta wawancara Kamis pagi"*.

Yang perlu dilihat: saat memilih **Diajukan ke klien**, muncul kotak biru yang
memberi tahu bahwa tanggal pengajuan akan **terkunci permanen** dan masa proteksi 12
bulan mulai berjalan. Itu tanggal yang menjadi bukti bila klien merekrut kandidat
tersebut lewat jalur lain.

### 3. Buktikan tanggal itu benar-benar terkunci

Setelah kandidat sampai **Diajukan ke klien**, mundurkan tahapnya ke *Diwawancara tim
kami*, lalu majukan lagi ke *Diajukan ke klien*.

Yang perlu dilihat: di kotak **Bukti pengajuan** di kanan, **tanggalnya tidak berubah**
— tetap tanggal pertama kali diajukan. Basis data menolak menimpanya, bukan cuma
layarnya yang menyembunyikan.

Perpindahan mundur itu pun ikut tercatat di riwayat. Tidak ada langkah yang bisa
dihapus.

### 4. Coba melompat tahap

Sebagai **pemilik**, buka satu pengajuan yang masih di tahap awal, lalu pilih tahap
yang jauh di depan — misalnya langsung ke *Ditawari* — dan klik simpan tanpa mengisi
catatan.

Yang perlu dilihat: ditolak, dengan kalimat yang menyebutkan alasannya wajib ditulis.
Isi alasannya, lalu simpan lagi — kali ini berhasil, dan alasannya tersimpan di
riwayat.

Bila Anda masuk sebagai **perekrut**, tahap yang jauh itu **tidak ditawarkan sama
sekali**. Perekrut hanya bisa maju satu tahap. Hanya Anda yang boleh melompat, dan
tetap harus beralasan.

### 5. Coba tolak satu kandidat

Pilih tahap **Ditolak**. Muncul dua isian wajib: siapa yang menolak (kami atau klien)
dan alasannya.

Kenapa diwajibkan: tanpa alasan, tidak ada cara menjawab pertanyaan *"kenapa 8 dari 10
kandidat kita ditolak klien ini?"* — dan itu satu-satunya pertanyaan yang bisa
memperbaiki mutu penyaringan.

### 6. Lihat peringatan masa proteksi

Buat **lowongan kedua untuk klien yang sama**, lalu buka kotak *"Kaitkan kandidat"*.

Yang perlu dilihat: kandidat yang tadi sudah diajukan ke klien itu kini punya kotak
kuning — menyebut kapan ia pertama diajukan, lewat lowongan mana, dan sampai kapan
masa proteksinya berjalan.

**Ia tetap bisa dikaitkan.** Ini peringatan, bukan larangan. Yang perlu Anda tahu:
klaim fee dihitung dari pengajuan **pertama**, bukan yang baru.

---

## Yang juga ikut berubah di fase ini

**Enam isian baru di formulir lowongan**, sesuai yang Anda setujui:

- Tugas utama sehari-hari
- Departemen / divisi
- Atasan langsung
- Pola kerja (di kantor / dari rumah / campuran / lapangan)
- Tunjangan di luar gaji pokok
- Tahapan wawancara di sisi klien

Semuanya boleh dikosongkan. Lowongan yang sudah terlanjur dibuat tidak jadi bermasalah
— isiannya cuma kosong sampai Anda mengisinya.

Dua hal yang **sengaja tidak** disediakan kotaknya: preferensi jenis kelamin dan batas
usia. Keduanya diskriminatif, dan menyediakan kotaknya sama saja dengan mengundang
pemakaiannya.

---

## Yang belum ada, dan kapan gilirannya

| Yang mungkin Anda cari | Kapan |
|---|---|
| Menghitung fee, membuat tagihan, melacak garansi | **Fase 3 — berikutnya** |
| Ekspor bukti proteksi kandidat berbentuk PDF | Fase 3 |
| Skor kecocokan AI, ekstraksi CV otomatis | Fase 4, setelah Fase 3 dipakai |
| Portal klien dan kartu buta | Fase 5 |
| Template WhatsApp, dasbor metrik lengkap | Fase 6 |

Kolom skor AI (`ai_match_score`) sudah ada tempatnya di tabel pengajuan sejak sekarang
— itu sebabnya Fase 2 harus lebih dulu. Sebelum tabel ini ada, tidak ada tempat untuk
menyimpan skornya.

---

## Bila ada yang terasa keliru

Yang paling saya ingin Anda periksa:

1. **Nama tahapnya.** *Dikaitkan, Lolos saringan, Diwawancara tim kami, Diajukan ke
   klien, Wawancara klien, Ditawari, Tanda tangan, Mulai bekerja, Lolos garansi.*
   Kalau di tempat Anda istilahnya berbeda, sebutkan — menggantinya mudah dan hanya di
   satu berkas.
2. **Aturan "perekrut hanya boleh maju satu tahap".** Kalau di lapangan ini terasa
   terlalu ketat, bilang. Yang saya jaga adalah jangan sampai ada kandidat yang
   tiba-tiba berstatus *Tanda tangan* tanpa pernah punya tanggal pengajuan — karena
   tanggal itulah dasar tagihan.
3. **Wajibnya alasan penolakan.** Melonggarkannya gampang, tapi angkanya akan hilang.
