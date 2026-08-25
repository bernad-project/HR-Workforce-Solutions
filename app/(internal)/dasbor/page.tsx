import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ambilPengaturanPerusahaan, ambilRingkasanDasbor } from '@/lib/db/queries/dasbor'
import { formatPersen } from '@/lib/format'

export const metadata: Metadata = { title: 'Dasbor · Modul Headhunter' }

// Angka dasbor selalu dibaca segar dari basis data, bukan dari cache.
export const dynamic = 'force-dynamic'

const FASE = [
  { no: 0, nama: 'Fondasi', isi: 'Masuk, migrasi, akun pemilik', keadaan: 'selesai' },
  { no: 1, nama: 'Data induk', isi: 'Klien, perjanjian, lowongan, kandidat, unggah CV', keadaan: 'berikutnya' },
  { no: 2, nama: 'Pipeline', isi: 'Pengajuan, papan tahapan, jejak audit', keadaan: 'menunggu' },
  { no: 3, nama: 'Uang', isi: 'Penempatan, fee, dua tagihan, garansi', keadaan: 'menunggu' },
  { no: 4, nama: 'AI', isi: 'Ekstraksi CV, skor kecocokan', keadaan: 'menunggu' },
  { no: 5, nama: 'Portal klien', isi: 'Magic link, tampilan terbatas', keadaan: 'menunggu' },
  { no: 6, nama: 'Komunikasi', isi: 'Template pesan, dasbor lengkap', keadaan: 'menunggu' },
  { no: 7, nama: 'Kepatuhan PDP', isi: 'Layar persetujuan, ekspor, penghapusan', keadaan: 'menunggu' },
] as const

const WARNA_KEADAAN: Record<string, string> = {
  selesai: 'bg-[#dcfce7] text-[var(--color-aman)]',
  berikutnya: 'bg-[var(--color-utama-redup)] text-[var(--color-utama)]',
  menunggu: 'bg-[var(--color-permukaan)] text-[var(--color-redup)]',
}

export default async function HalamanDasbor() {
  const sesi = await auth()
  const [ringkasan, pengaturan] = await Promise.all([
    ambilRingkasanDasbor(),
    ambilPengaturanPerusahaan(),
  ])

  const kartu = [
    { judul: 'Klien aktif', nilai: ringkasan.klienAktif },
    { judul: 'Lowongan terbuka', nilai: ringkasan.lowonganTerbuka },
    { judul: 'Kandidat', nilai: ringkasan.kandidat },
    { judul: 'Pengajuan berjalan', nilai: ringkasan.pengajuanAktif },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Selamat datang, {sesi?.user.name}</h1>
        <p className="mt-1 text-sm text-[var(--color-redup)]">
          {pengaturan?.legalName ?? 'Perusahaan belum diberi nama'}
        </p>
      </div>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kartu.map((k) => (
          <Card key={k.judul}>
            <CardHeader>
              <CardTitle>{k.judul}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="angka text-3xl font-semibold">{k.nilai}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Tahap pembangunan</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-[var(--color-garis)]">
              {FASE.map((f) => (
                <li key={f.no} className="flex items-start justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium">
                      Fase {f.no} — {f.nama}
                    </p>
                    <p className="text-xs text-[var(--color-redup)]">{f.isi}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${WARNA_KEADAAN[f.keadaan]}`}
                  >
                    {f.keadaan}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Pengaturan perusahaan</CardTitle>
          </CardHeader>
          <CardContent>
            {pengaturan ? (
              <dl className="space-y-2.5 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--color-redup)]">Status PKP</dt>
                  <dd className="text-right font-medium">
                    {pengaturan.isPkp ? 'Sudah PKP' : 'Belum PKP'}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--color-redup)]">PPN pada tagihan</dt>
                  <dd className="angka text-right font-medium">
                    {pengaturan.isPkp ? formatPersen(pengaturan.ppnRate) : 'tidak dikenakan'}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--color-redup)]">PPh 23 dipotong klien</dt>
                  <dd className="angka text-right font-medium">{formatPersen(pengaturan.pph23Rate)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--color-redup)]">Fee bawaan</dt>
                  <dd className="angka text-right font-medium">
                    {formatPersen(pengaturan.defaultFeePercent)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--color-redup)]">Garansi bawaan</dt>
                  <dd className="angka text-right font-medium">{pengaturan.defaultGuaranteeDays} hari</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--color-redup)]">Proteksi kandidat</dt>
                  <dd className="angka text-right font-medium">
                    {pengaturan.defaultProtectionMonths} bulan
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-[var(--color-redup)]">
                Baris pengaturan belum ada. Jalankan penyemaian basis data.
              </p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
