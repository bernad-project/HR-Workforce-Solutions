'use server'

import { signOut } from '@/lib/auth'

export async function aksiKeluar(): Promise<void> {
  await signOut({ redirectTo: '/masuk' })
}
