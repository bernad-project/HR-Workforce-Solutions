'use server'

import { revalidatePath } from 'next/cache'
import { sesiWajib } from '@/lib/auth'
import { pesanGalatBasisData } from '@/lib/db/galat'
import { buatPengajuan, pindahTahap, type Aktor } from '@/lib/db/queries/pengajuan'
import { skemaPengajuanBaru, skemaPindahTahap } from '@/lib/validation/pengajuan'
import { LABEL_TAHAP } from '@/lib/rules/tahapan'
import { bacaFormData, galatKeField, nilaiKembali, type KeadaanForm } from '@/lib/validation/umum'

async function aktorSekarang(): Promise<Aktor> {
  const sesi = await sesiWajib()
  return { id: sesi.user.id, peran: sesi.user.role }
}

/**
 * Mengaitkan satu kandidat ke satu lowongan.
 *
 * Sengaja tidak berpindah halaman setelah berhasil: perekrut biasanya
 * mengaitkan beberapa kandidat berturut-turut ke lowongan yang sama, dan
 * dilempar ke halaman lain setiap kali berarti mengulang pencarian dari awal.
 */
export async function simpanPengajuan(
  _sebelumnya: KeadaanForm,
  data: FormData,
): Promise<KeadaanForm> {
  const aktor = await aktorSekarang()
  const hasil = skemaPengajuanBaru.safeParse(bacaFormData(data))

  if (!hasil.success) {
    return {
      pesan: 'Ada isian yang perlu diperbaiki.',
      galat: galatKeField(hasil.error),
      nilai: nilaiKembali(data),
    }
  }

  let dibuat
  try {
    dibuat = await buatPengajuan(hasil.data, aktor)
  } catch (galat) {
    const pesan = pesanGalatBasisData(galat)
    if (pesan) return { pesan, galat: {}, nilai: nilaiKembali(data) }
    throw galat
  }

  revalidatePath(`/lowongan/${hasil.data.jobId}`)
  revalidatePath('/pipeline')
  revalidatePath(`/kandidat/${hasil.data.candidateId}`)

  return {
    pesan: null,
    galat: {},
    nilai: {},
    sukses: `${dibuat.nama} dikaitkan ke lowongan ini pada tahap "${LABEL_TAHAP.sourced}".`,
  }
}

/**
 * Memindahkan satu pengajuan ke tahap lain.
 *
 * Pemeriksaan urutan tahap, penulisan `submission_events`, dan penulisan
 * `submitted_at` sekali seumur hidup semuanya terjadi di satu transaksi di
 * `lib/db/queries/pengajuan.ts`. Aksi ini hanya membaca isian dan menerjemahkan
 * hasilnya jadi kalimat.
 */
export async function simpanPindahTahap(
  _sebelumnya: KeadaanForm,
  data: FormData,
): Promise<KeadaanForm> {
  const aktor = await aktorSekarang()
  const hasil = skemaPindahTahap.safeParse(bacaFormData(data))

  if (!hasil.success) {
    return {
      pesan: 'Ada isian yang perlu diperbaiki.',
      galat: galatKeField(hasil.error),
      nilai: nilaiKembali(data),
    }
  }

  let jawaban
  try {
    jawaban = await pindahTahap(hasil.data, aktor)
  } catch (galat) {
    const pesan = pesanGalatBasisData(galat)
    if (pesan) return { pesan, galat: {}, nilai: nilaiKembali(data) }
    throw galat
  }

  if (!jawaban.jadi) {
    return {
      pesan: jawaban.medan ? null : jawaban.pesan,
      galat: jawaban.medan ? { [jawaban.medan]: jawaban.pesan } : {},
      nilai: nilaiKembali(data),
    }
  }

  revalidatePath(`/pengajuan/${hasil.data.submissionId}`)
  revalidatePath('/pipeline')
  revalidatePath('/lowongan')
  revalidatePath('/dasbor')

  return {
    pesan: null,
    galat: {},
    nilai: {},
    sukses: `Tahap dipindahkan ke "${LABEL_TAHAP[hasil.data.ke]}". Perpindahannya tercatat di riwayat.`,
  }
}
