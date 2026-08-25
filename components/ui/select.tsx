import * as React from 'react'
import { cn } from '@/lib/utils'

export function Select({
  className,
  children,
  defaultValue,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      /**
       * React 19 mengembalikan isian form ke nilai bawaannya setelah server
       * action selesai — termasuk saat aksinya gagal.
       *
       * Untuk `<input>`, nilai bawaan itu ikut diperbarui saat komponen dirender
       * ulang, jadi isian kembali seperti yang tadi diketik. Untuk `<select>`
       * tidak: nilai bawaannya ditanam sebagai atribut `selected` pada salah satu
       * pilihan, sekali saja saat pertama dipasang. Akibatnya pilihan klien dan
       * status lowongan kembali kosong setiap kali ada satu isian lain yang
       * keliru — dan kiriman berikutnya membawa nilai kosong itu.
       *
       * Kunci di bawah memaksa elemennya dipasang ulang begitu nilai bawaannya
       * berubah, sehingga pilihan yang tadi dibuat kembali seperti semula.
       */
      key={String(defaultValue ?? '')}
      defaultValue={defaultValue}
      className={cn(
        'flex h-10 w-full appearance-none rounded-md border border-[var(--color-garis)] bg-white',
        'px-3 py-2 pr-8 text-sm',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-utama)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        "bg-[url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%236b7280'%3E%3Cpath d='M4.5 6.5 8 10l3.5-3.5z'/%3E%3C/svg%3E\")]",
        'bg-[length:16px] bg-[right_0.5rem_center] bg-no-repeat',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
}
