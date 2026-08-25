'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { sesiWajib } from '@/lib/auth'
import { pesanGalatBasisData } from '@/lib/db/galat'
import { buatLowongan, ubahLowongan } from '@/lib/db/queries/lowongan'
import { skemaLowongan } from '@/lib/validation/lowongan'
import { bacaFormData, galatKeField, nilaiKembali, type KeadaanForm } from '@/lib/validation/umum'

export async function simpanLowongan(
  _sebelumnya: KeadaanForm,
  data: FormData,
): Promise<KeadaanForm> {
  const sesi = await sesiWajib()
  const id = data.get('id')
  const hasil = skemaLowongan.safeParse(bacaFormData(data))

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
      await ubahLowongan(id, hasil.data)
      tujuan = `/lowongan/${id}`
    } else {
      tujuan = `/lowongan/${await buatLowongan(hasil.data, sesi.user.id)}`
    }
  } catch (galat) {
    const pesan = pesanGalatBasisData(galat)
    if (pesan) return { pesan, galat: {}, nilai: nilaiKembali(data) }
    throw galat
  }

  revalidatePath('/lowongan')
  revalidatePath(`/klien/${hasil.data.clientId}`)
  redirect(tujuan)
}
