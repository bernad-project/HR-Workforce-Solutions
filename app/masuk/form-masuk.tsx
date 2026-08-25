'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { aksiMasuk, type KeadaanMasuk } from './aksi'

const AWAL: KeadaanMasuk = { pesan: null, email: '' }

export function FormMasuk() {
  const [keadaan, kirim, sedangKirim] = useActionState(aksiMasuk, AWAL)

  return (
    <form action={kirim} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          // Diisikan ulang setelah percobaan yang gagal — lihat catatan di aksi.ts.
          defaultValue={keadaan.email}
          key={keadaan.email}
          placeholder="nama@perusahaan.co.id"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Kata sandi</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>

      {keadaan.pesan ? (
        <p
          role="alert"
          className="rounded-md bg-[var(--color-bahaya-redup)] px-3 py-2 text-sm text-[var(--color-bahaya)]"
        >
          {keadaan.pesan}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={sedangKirim}>
        {sedangKirim ? 'Memeriksa...' : 'Masuk'}
      </Button>
    </form>
  )
}
