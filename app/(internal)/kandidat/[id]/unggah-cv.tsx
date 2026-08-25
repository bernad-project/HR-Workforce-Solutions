'use client'

import { useActionState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { PesanGalat } from '@/components/ui/field'
import { KEADAAN_AWAL } from '@/lib/validation/umum'
import { unggahCv } from '../aksi'

export function UnggahCv({ candidateId }: { candidateId: string }) {
  const [keadaan, kirim, sedangKirim] = useActionState(unggahCv, KEADAAN_AWAL)
  const berkasRef = useRef<HTMLInputElement>(null)

  return (
    <form action={kirim} className="space-y-3">
      <input type="hidden" name="candidateId" value={candidateId} />

      <input
        ref={berkasRef}
        type="file"
        name="berkas"
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="block w-full text-sm text-[var(--color-redup)]
          file:mr-3 file:rounded-md file:border file:border-[var(--color-garis)]
          file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium
          file:text-[var(--color-tinta)] hover:file:bg-[var(--color-permukaan)]"
        required
      />

      <PesanGalat pesan={keadaan.pesan} />

      <div className="flex items-center gap-3">
        <Button type="submit" size="kecil" disabled={sedangKirim}>
          {sedangKirim ? 'Mengunggah...' : 'Unggah CV'}
        </Button>
        <span className="text-xs text-[var(--color-redup)]">PDF, DOC, atau DOCX. Maksimal 10 MB.</span>
      </div>
    </form>
  )
}
