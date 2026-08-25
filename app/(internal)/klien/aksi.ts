'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { sesiOwnerWajib, sesiWajib } from '@/lib/auth'
import { pesanGalatBasisData } from '@/lib/db/galat'
import {
  buatKlien,
  buatPerjanjian,
  nonaktifkanPerjanjianLain,
  ubahKlien,
} from '@/lib/db/queries/klien'
import { skemaKlien, skemaPerjanjian } from '@/lib/validation/klien'
import { bacaFormData, galatKeField, nilaiKembali, type KeadaanForm } from '@/lib/validation/umum'

export async function simpanKlien(_sebelumnya: KeadaanForm, data: FormData): Promise<KeadaanForm> {
  const sesi = await sesiWajib()
  const id = data.get('id')
  const hasil = skemaKlien.safeParse(bacaFormData(data))

  if (!hasil.success) {
    return {
      pesan: 'Ada isian yang perlu diperbaiki.',
      galat: galatKeField(hasil.error),
      nilai: nilaiKembali(data),
    }
  }

  let tujuan: string
  try {
    if (typeof id === 'string' && id !== '') {
      await ubahKlien(id, hasil.data)
      tujuan = `/klien/${id}`
    } else {
      tujuan = `/klien/${await buatKlien(hasil.data, sesi.user.id)}`
    }
  } catch (galat) {
    const pesan = pesanGalatBasisData(galat)
    if (pesan) return { pesan, galat: {}, nilai: nilaiKembali(data) }
    throw galat
  }

  revalidatePath('/klien')
  redirect(tujuan)
}

/**
 * Menyimpan perjanjian jasa rekrutmen.
 *
 * Hanya `owner`. Perjanjian memuat persentase fee, dan peran `recruiter` tidak
 * pernah melihat nilai fee (CLAUDE.md poin 8).
 */
export async function simpanPerjanjian(
  _sebelumnya: KeadaanForm,
  data: FormData,
): Promise<KeadaanForm> {
  await sesiOwnerWajib()

  const clientId = data.get('clientId')
  if (typeof clientId !== 'string' || clientId === '') {
    return { pesan: 'Klien tidak dikenali.', galat: {}, nilai: nilaiKembali(data) }
  }

  const hasil = skemaPerjanjian.safeParse(bacaFormData(data))
  if (!hasil.success) {
    return {
      pesan: 'Ada isian yang perlu diperbaiki.',
      galat: galatKeField(hasil.error),
      nilai: nilaiKembali(data),
    }
  }

  try {
    const id = await buatPerjanjian(clientId, hasil.data)
    // Satu perjanjian aktif per klien: yang baru menggantikan yang lama sebagai
    // bawaan, tapi yang lama tidak dihapus karena masih jadi rujukan riwayat.
    await nonaktifkanPerjanjianLain(clientId, id)
  } catch (galat) {
    const pesan = pesanGalatBasisData(galat)
    if (pesan) return { pesan, galat: {}, nilai: nilaiKembali(data) }
    throw galat
  }

  revalidatePath(`/klien/${clientId}`)
  redirect(`/klien/${clientId}`)
}
