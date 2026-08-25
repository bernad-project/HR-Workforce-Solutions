/**
 * Membaca variabel lingkungan untuk skrip baris perintah.
 *
 * Next.js otomatis membaca `.env.local`, tapi skrip Node biasa tidak. Berkas ini
 * menyamakan keduanya supaya `npm run db:migrate` memakai pengaturan yang sama
 * dengan aplikasi. Urutan: `.env.local` menang atas `.env`.
 *
 * Di Vercel, variabel sudah tersedia di lingkungan dan berkas ini tidak menimpa
 * apa pun yang sudah ada.
 */
import { config } from 'dotenv'
import { resolve } from 'node:path'

const AKAR = resolve(import.meta.dirname, '..')

config({ path: resolve(AKAR, '.env.local') })
config({ path: resolve(AKAR, '.env') })

export { AKAR }
