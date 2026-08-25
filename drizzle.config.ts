import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

// `.env.local` menang atas `.env`, sama seperti perilaku Next.js.
config({ path: '.env.local' })
config({ path: '.env' })

/**
 * Migrasi berbasis berkas, di-commit ke repo (CLAUDE.md "Basis data dan hosting").
 *
 * Migrasi 0000 adalah salinan persis `docs/schema.sql` — skema yang sudah diuji.
 * Skema itu tidak dirancang ulang oleh Drizzle; `lib/db/schema.ts` hanya cerminan
 * TypeScript-nya supaya query bisa diketik.
 */
export default defineConfig({
  dialect: 'postgresql',
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  casing: 'snake_case',
  verbose: true,
  strict: true,
})
