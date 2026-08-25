'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { sesiWajib } from '@/lib/auth'
import { catatAudit } from '@/lib/audit'
import { pesanGalatBasisData } from '@/lib/db/galat'
import {
  buatKandidatDenganPersetujuan,
  cariKandidatSerupa,
  catatDokumen,
  ubahKandidat,
} from '@/lib/db/queries/kandidat'
import { GalatUnggah, unggahDokumen } from '@/lib/storage'
import { skemaKandidat, skemaKandidatBaru } from '@/lib/validation/kandidat'
import { bacaFormData, galatKeField, nilaiKembali, type KeadaanForm } from '@/lib/validation/umum'

async function alamatIp(): Promise<string | null> {
  try {
    const h = await headers()
    return h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? null
  } catch {
    return null
  }
}

/**
 * Membuat kandidat baru beserta catatan persetujuannya.
 *
 * Pencegahan kembar berjalan dua tingkat (SPEC §5.6):
 *  · nomor telepon atau email yang sama → dihentikan, karena itu pasti orang
 *    yang sama dan basis data pun akan menolaknya;
 *  · nama yang mirip → hanya diperingatkan, lalu manusia yang memutuskan.
 *    Sistem tidak boleh memutuskan sendiri bahwa dua orang bernama sama adalah
 *    orang yang sama.
 */
export async function simpanKandidatBaru(
  _sebelumnya: KeadaanForm,
  data: FormData,
): Promise<KeadaanForm> {
  const sesi = await sesiWajib()
  const hasil = skemaKandidatBaru.safeParse(bacaFormData(data))

  if (!hasil.success) {
    return {
      pesan: 'Ada isian yang perlu diperbaiki.',
      galat: galatKeField(hasil.error),
      nilai: nilaiKembali(data),
      konfirmasi: null,
    }
  }

  const {
    persetujuanMethod,
    persetujuanEvidence,
    persetujuanKonfirmasi: _konfirmasi,
    abaikanSerupa,
    ...kandidat
  } = hasil.data

  const serupa = await cariKandidatSerupa(kandidat)

  if (serupa.pasti.length > 0) {
    const daftar = serupa.pasti.map((s) => `${s.nama} (${s.alasan.toLowerCase()})`).join(', ')
    return {
      pesan: `Kandidat ini sudah ada di basis data: ${daftar}. Buka datanya dan perbarui di sana, jangan buat baru.`,
      galat: {},
      nilai: nilaiKembali(data),
      konfirmasi: {
        pesan: 'Kandidat yang sudah ada:',
        serupa: serupa.pasti.map((s) => ({ id: s.id, nama: s.nama, keterangan: s.keterangan })),
      },
    }
  }

  if (serupa.mungkin.length > 0 && abaikanSerupa !== 'ya') {
    return {
      pesan: null,
      galat: {},
      nilai: nilaiKembali(data),
      konfirmasi: {
        pesan:
          'Ada kandidat dengan nama mirip. Periksa dulu — kalau ini orang yang sama, buka datanya ' +
          'dan perbarui di sana. Kalau memang orang berbeda, lanjutkan.',
        serupa: serupa.mungkin.map((s) => ({ id: s.id, nama: s.nama, keterangan: s.keterangan })),
      },
    }
  }

  let idBaru: string
  try {
    idBaru = await buatKandidatDenganPersetujuan(
      kandidat,
      { method: persetujuanMethod, evidence: persetujuanEvidence },
      sesi.user.id,
      await alamatIp(),
    )
  } catch (galat) {
    const pesan = pesanGalatBasisData(galat)
    if (pesan) return { pesan, galat: {}, nilai: nilaiKembali(data), konfirmasi: null }
    throw galat
  }

  await catatAudit({
    actorType: 'user',
    actorId: sesi.user.id,
    action: 'create_candidate',
    entityType: 'candidate',
    entityId: idBaru,
    detail: { saluranPersetujuan: persetujuanMethod },
  })

  revalidatePath('/kandidat')
  redirect(`/kandidat/${idBaru}`)
}

export async function simpanPerubahanKandidat(
  _sebelumnya: KeadaanForm,
  data: FormData,
): Promise<KeadaanForm> {
  const sesi = await sesiWajib()
  const id = data.get('id')
  if (typeof id !== 'string' || id === '') {
    return { pesan: 'Kandidat tidak dikenali.', galat: {}, nilai: nilaiKembali(data), konfirmasi: null }
  }

  const hasil = skemaKandidat.safeParse(bacaFormData(data))
  if (!hasil.success) {
    return {
      pesan: 'Ada isian yang perlu diperbaiki.',
      galat: galatKeField(hasil.error),
      nilai: nilaiKembali(data),
      konfirmasi: null,
    }
  }

  const serupa = await cariKandidatSerupa(hasil.data, id)
  if (serupa.pasti.length > 0) {
    const daftar = serupa.pasti.map((s) => `${s.nama} (${s.alasan.toLowerCase()})`).join(', ')
    return { pesan: `Data ini bentrok dengan kandidat lain: ${daftar}.`, galat: {}, nilai: nilaiKembali(data), konfirmasi: null }
  }

  try {
    await ubahKandidat(id, hasil.data)
  } catch (galat) {
    const pesan = pesanGalatBasisData(galat)
    if (pesan) return { pesan, galat: {}, nilai: nilaiKembali(data), konfirmasi: null }
    throw galat
  }

  await catatAudit({
    actorType: 'user',
    actorId: sesi.user.id,
    action: 'update_candidate',
    entityType: 'candidate',
    entityId: id,
  })

  revalidatePath('/kandidat')
  redirect(`/kandidat/${id}`)
}

/**
 * Mengunggah CV.
 *
 * Berkasnya ke Vercel Blob, bukan ke basis data. Yang tersimpan di
 * `candidate_documents` hanya kuncinya (CLAUDE.md "Basis data dan hosting").
 */
export async function unggahCv(_sebelumnya: KeadaanForm, data: FormData): Promise<KeadaanForm> {
  const sesi = await sesiWajib()

  const candidateId = data.get('candidateId')
  const berkas = data.get('berkas')

  if (typeof candidateId !== 'string' || candidateId === '') {
    return { pesan: 'Kandidat tidak dikenali.', galat: {}, nilai: nilaiKembali(data), konfirmasi: null }
  }
  if (!(berkas instanceof File) || berkas.size === 0) {
    return { pesan: 'Pilih berkas CV lebih dulu.', galat: {}, nilai: nilaiKembali(data), konfirmasi: null }
  }

  try {
    const hasil = await unggahDokumen(candidateId, berkas)
    await catatDokumen({ candidateId, ...hasil, uploadedBy: sesi.user.id })
  } catch (galat) {
    if (galat instanceof GalatUnggah) {
      return { pesan: galat.message, galat: {}, nilai: nilaiKembali(data), konfirmasi: null }
    }
    const pesan = pesanGalatBasisData(galat)
    if (pesan) return { pesan, galat: {}, nilai: nilaiKembali(data), konfirmasi: null }
    throw galat
  }

  await catatAudit({
    actorType: 'user',
    actorId: sesi.user.id,
    action: 'upload_cv',
    entityType: 'candidate',
    entityId: candidateId,
    detail: { namaBerkas: berkas.name, ukuranByte: berkas.size },
  })

  revalidatePath(`/kandidat/${candidateId}`)
  return { pesan: null, galat: {}, nilai: nilaiKembali(data), konfirmasi: null }
}
