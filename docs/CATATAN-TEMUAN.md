# Catatan temuan — hal yang perlu keputusan pemilik

Ditulis setelah `docs/schema.sql` dan `docs/test_rules.sql` dijalankan sungguhan di
Postgres 16. Skema jalan bersih dan **sepuluh uji aturan bisnis berperilaku persis
seperti yang tertulis di komentarnya.**

Empat hal di bawah bukan kegagalan uji. Semuanya adalah tempat di mana `SPEC.md`
dan skema berbeda, atau di mana aturan uang belum punya penjaga. Ditulis di sini
supaya tidak hilang, dan supaya tidak ada yang diam-diam disesuaikan
(`CLAUDE.md`, "Yang tidak boleh dilanggar").

---

## 1. Peringatan masa proteksi bisa muncul dua kali untuk pasangan yang sama

**Yang diminta SPEC §5.5:** satu masa proteksi per pasangan (kandidat, klien),
dihitung dari pengajuan **paling awal**.

**Yang terjadi sekarang:** `candidate_protection` mengelompokkan juga berdasarkan
`protection_months`. Bila satu kandidat diajukan ke klien yang sama lewat dua
lowongan dengan perjanjian berbeda — atau salah satunya belum dikaitkan ke
perjanjian mana pun — hasilnya dua baris dengan dua tanggal akhir berbeda.

Sudah diuji: kandidat yang sama diajukan ke satu klien lewat dua lowongan,
hasilnya dua baris (berakhir Maret 2027 dan Agustus 2027).

**Akibatnya bagi perusahaan:** saat terjadi sengketa, sistem memberi dua jawaban
untuk pertanyaan "sampai kapan kandidat ini terlindungi di klien ini". Dua jawaban
lebih lemah daripada satu di meja perundingan.

**Yang perlu diputuskan.** Setiap pengajuan sebenarnya memulai hitungan 12
bulannya sendiri menurut Pasal 4. Jadi ada dua cara membacanya:

- **(a) Pengajuan paling awal** — persis seperti tertulis di SPEC. Pada contoh di
  atas, proteksi habis Maret 2027.
- **(b) Perlindungan terlama di antara semua pengajuan** — proteksi habis Agustus
  2027, dan tanggal pengajuan paling awal tetap disimpan sebagai bukti kapan
  hubungan dimulai.

**Saran:** ambil (b). Ia melindungi pendapatan lebih lama tanpa kehilangan bukti
apa pun, dan hasilnya tetap satu baris per pasangan. Bila (b) dipilih, SPEC §5.5
poin 2 perlu diperbarui lebih dulu, baru `docs/schema.sql`.

---

## 2. Pemilik tidak bisa menimpa fee di luar 10%–30%

**Yang diminta SPEC §5.1:** sistem menolak fee di bawah 10% atau di atas 30%,
**"kecuali `owner` menimpa secara eksplisit dengan alasan tertulis"**.

**Yang terjadi sekarang:** basis data menolaknya mutlak, lewat `chk_fee_range` di
`client_agreements` dan pemeriksaan yang sama di `placements`. Tidak ada jalan
menimpanya, dan tidak ada kolom untuk menyimpan alasan tertulisnya.

Sudah diuji: mencoba membuat penempatan dengan fee 35% ditolak basis data.

**Yang perlu diputuskan.**

- **(a) Biarkan mutlak** — hapus kalimat "kecuali owner menimpa" dari SPEC §5.1.
- **(b) Izinkan penimpaan** — perlu kolom baru `fee_override_reason` di
  `client_agreements` dan `placements`, pelonggaran constraint, dan jalur khusus
  yang hanya bisa dilewati peran `owner`.

**Saran:** ambil (a). Rentang 10%–30% sudah sangat lebar; di bawah 10% pekerjaan
tidak menutup biaya, di atas 30% klien lari. Pilihan (b) berarti menambah kolom,
melonggarkan penjaga, dan menambah satu jalur yang harus dirawat selamanya —
untuk kejadian yang mungkin tidak pernah datang. Bila suatu saat benar-benar
perlu, (b) bisa ditambahkan kemudian tanpa membongkar apa pun.

---

## 3. Tanggal terbit tagihan kedua bisa kosong

**Yang diminta SPEC §5.2:** tagihan kedua terbit pada `probation_end_date`, jatuh
tempo `payment_terms_days` sesudahnya.

**Yang terjadi sekarang:** `probation_end_date` boleh kosong dan tidak dihitung
otomatis, sementara `guarantee_end_date` dihitung otomatis dari
`start_date + guarantee_days`. Bila penempatan dibuat tanpa mengisinya, tagihan
kedua lahir **tanpa tanggal terbit dan tanpa jatuh tempo**.

Sudah diuji: penempatan tanpa `probation_end_date` berhasil dibuat, dan
`guarantee_end_date` tetap terisi sendiri.

**Akibatnya bagi perusahaan:** tagihan tanpa jatuh tempo tidak akan pernah muncul
di daftar "tagihan jatuh tempo" di dasbor (SPEC §12). Ini persis cara satu tagihan
terlewat — hal yang menurut SPEC §2 justru paling ingin dicegah.

**Yang perlu diputuskan:** apakah masa percobaan selalu sama dengan masa garansi?

- **(a) Sama** — isi otomatis `probation_end_date = start_date + guarantee_days`,
  masih bisa disunting bila kontrak kandidat berbeda.
- **(b) Beda** — jadikan `probation_end_date` wajib diisi saat membuat penempatan.

**Saran:** ambil (a), dengan tetap bisa disunting. Masa percobaan menurut UU
Ketenagakerjaan paling lama 3 bulan, dan garansi bawaan 90 hari, jadi keduanya
biasanya berimpit. Apa pun pilihannya, sistem tidak boleh membiarkan tagihan
kedua lahir tanpa tanggal.

---

## 4. Dua aturan uang belum punya penjaga — dikerjakan di Fase 3

Keduanya di luar jangkauan basis data dan memang harus ditegakkan di kode. Dicatat
di sini supaya tidak terlewat saat Fase 3 dikerjakan.

| Aturan | Sumber | Keadaan sekarang |
|---|---|---|
| Tagihan kedua tidak boleh berstatus `sent` sebelum garansi lewat | SPEC §5.2 | Sudah diuji: tagihan kedua bisa dikirim saat penempatan masih `active` |
| Penempatan pengganti tidak menghasilkan tagihan baru | SPEC §5.4 | Sudah diuji: tagihan tetap bisa dibuat untuk penempatan pengganti |

Keduanya akan ditutup di Fase 3 lewat `lib/rules/`, lengkap dengan tesnya.

---

## Yang sudah terbukti benar

Dijalankan sungguhan, bukan dibaca saja:

- Fee: gaji pokok Rp8.333.333 × 12 × 15% → `fee_amount` Rp14.999.999
- Dua tagihan: Rp7.500.000 + Rp7.499.999 = **persis** Rp14.999.999
- `submitted_at` menolak diubah setelah terisi
- Kandidat yang sama tidak bisa diajukan dua kali ke lowongan yang sama
- Fee 5% ditolak
- Lowongan `open` tanpa `reason_previous_failed` ditolak
- Satu penempatan hanya boleh punya satu pengganti
- Nomor telepon kandidat yang kembar ditolak
- PPN 11% muncul begitu `is_pkp` dinyalakan, dan hilang lagi saat dimatikan
- PPh 23 2% dipotong dalam keadaan apa pun
