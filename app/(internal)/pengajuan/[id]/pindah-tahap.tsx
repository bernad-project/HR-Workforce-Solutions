'use client'

import { useActionState, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Field, PesanGalat, PesanSukses } from '@/components/ui/field'
import { KEADAAN_AWAL } from '@/lib/validation/umum'
import { PENOLAK } from '@/lib/validation/pengajuan'
import { KETERANGAN_TAHAP, LABEL_TAHAP, pilihanPerpindahan } from '@/lib/rules/tahapan'
import type { TahapPengajuan } from '@/lib/db/schema'
import { formatWaktu } from '@/lib/format'
import { simpanPindahTahap } from '../aksi'

export function PindahTahap({
  submissionId,
  tahapSekarang,
  peran,
  submittedAt,
  cv,
}: {
  submissionId: string
  tahapSekarang: TahapPengajuan
  peran: 'owner' | 'recruiter'
  submittedAt: Date | null
  cv: { id: string; fileName: string; uploadedAt: Date }[]
}) {
  const [keadaan, kirim, sedangKirim] = useActionState(simpanPindahTahap, KEADAAN_AWAL)
  const g = keadaan.galat

  // Sudah diurutkan menurut kemungkinan dipakainya, dan yang pertama jadi
  // nilai bawaan kotak pilihan — lihat catatan di lib/rules/tahapan.ts.
  const pilihan = pilihanPerpindahan(tahapSekarang, peran)

  const [tujuan, setTujuan] = useState<string>(pilihan[0]?.tahap ?? '')

  useEffect(() => {
    setTujuan(pilihan[0]?.tahap ?? '')
    // Daftar pilihan hanya berubah bila tahap sekarang berubah.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tahapSekarang])

  const izin = pilihan.find((p) => p.tahap === tujuan)?.izin
  const perluCatatan = izin?.perluCatatan ?? false
  const peringatan = izin?.peringatan
  const menolak = tujuan === 'rejected'
  const keKlien = tujuan === 'submitted_to_client'

  if (pilihan.length === 0) {
    return (
      <p className="text-sm text-[var(--color-redup)]">
        Pengajuan ini sudah di tahap terakhir. Tidak ada perpindahan berikutnya.
      </p>
    )
  }

  return (
    <form action={kirim} className="space-y-4">
      <input type="hidden" name="submissionId" value={submissionId} />
      <PesanGalat pesan={keadaan.pesan} />
      <PesanSukses pesan={keadaan.sukses} />

      <Field htmlFor="ke" label="Pindahkan ke tahap" galat={g.ke}>
        <Select
          id="ke"
          name="ke"
          defaultValue={tujuan}
          onChange={(e) => setTujuan(e.currentTarget.value)}
        >
          {pilihan.map((p) => (
            <option key={p.tahap} value={p.tahap}>
              {LABEL_TAHAP[p.tahap]}
            </option>
          ))}
        </Select>
      </Field>

      {tujuan ? (
        <p className="text-xs text-[var(--color-redup)]">
          {KETERANGAN_TAHAP[tujuan as TahapPengajuan]}
        </p>
      ) : null}

      {peringatan ? (
        <p className="rounded-md bg-[#fef3c7] px-3 py-2 text-sm text-[#92400e]">{peringatan}</p>
      ) : null}

      {/*
        SPEC §5.5: stempel waktu pengajuan bernilai hukum dan tidak pernah
        berubah setelah terisi. Kalimat ini muncul justru pada saat ia akan
        ditulis, supaya perekrut tahu apa yang sedang dikunci.
      */}
      {keKlien ? (
        <div className="rounded-md border border-[var(--color-utama)] bg-[var(--color-utama-redup)] px-3 py-2 text-sm">
          {submittedAt === null ? (
            <p className="text-[var(--color-utama)]">
              Begitu disimpan, tanggal pengajuan tercatat permanen dan masa proteksi 12 bulan mulai
              berjalan. Tanggal ini tidak bisa diubah lagi — ia yang menjadi bukti bila klien
              merekrut kandidat ini lewat jalur lain.
            </p>
          ) : (
            <p className="text-[var(--color-utama)]">
              Pengajuan ini sudah punya tanggal pengajuan: {formatWaktu(submittedAt)}. Tanggal itu
              tetap dipakai dan tidak ditulis ulang.
            </p>
          )}
        </div>
      ) : null}

      {keKlien && cv.length > 0 ? (
        <Field
          htmlFor="documentId"
          label="CV versi mana yang dikirim"
          bantuan="Ikut disimpan sebagai bagian berkas bukti bila suatu hari terjadi sengketa."
          galat={g.documentId}
        >
          <Select id="documentId" name="documentId" defaultValue={cv[0]?.id ?? ''}>
            <option value="">Belum ditentukan</option>
            {cv.map((d) => (
              <option key={d.id} value={d.id}>
                {d.fileName} — diunggah {formatWaktu(d.uploadedAt)}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}

      {menolak ? (
        <div className="space-y-4 rounded-md border border-[var(--color-garis)] bg-[var(--color-permukaan)] p-3">
          <Field htmlFor="rejectedBy" label="Siapa yang menolak" wajib galat={g.rejectedBy}>
            <Select id="rejectedBy" name="rejectedBy" defaultValue="">
              <option value="">Pilih</option>
              {PENOLAK.map((p) => (
                <option key={p.nilai} value={p.nilai}>
                  {p.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            htmlFor="rejectionReason"
            label="Alasan penolakan"
            wajib
            bantuan="Tanpa alasan, tidak ada cara menjawab kenapa banyak kandidat ditolak klien ini — dan itu satu-satunya pertanyaan yang bisa memperbaiki mutu penyaringan."
            galat={g.rejectionReason}
          >
            <Textarea
              id="rejectionReason"
              name="rejectionReason"
              rows={2}
              defaultValue={keadaan.nilai.rejectionReason ?? ''}
            />
          </Field>
        </div>
      ) : null}

      <Field
        htmlFor="catatan"
        label="Catatan perpindahan"
        wajib={perluCatatan}
        bantuan="Ikut tersimpan di riwayat dan tidak bisa dihapus."
        galat={g.catatan}
      >
        <Textarea
          id="catatan"
          name="catatan"
          rows={2}
          defaultValue={keadaan.nilai.catatan ?? ''}
          placeholder="Misalnya: klien minta jadwal wawancara Kamis pagi"
        />
      </Field>

      <Button type="submit" disabled={sedangKirim}>
        {sedangKirim ? 'Menyimpan...' : 'Simpan perpindahan'}
      </Button>
    </form>
  )
}
