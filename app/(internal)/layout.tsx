import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { aksiKeluar } from './aksi-keluar'

/**
 * Rangka halaman internal (owner dan recruiter).
 *
 * Menu tumbuh mengikuti fase pembangunan di SPEC §11. Menu yang fasenya belum
 * selesai sengaja ditampilkan tapi belum bisa diklik, supaya terlihat apa yang
 * sedang dibangun dan tidak ada tautan yang menjatuhkan ke halaman kosong.
 */
type Menu = { label: string; href: string; siap: boolean; hanyaOwner?: boolean }

const MENU: Menu[] = [
  { label: 'Dasbor', href: '/dasbor', siap: true },
  { label: 'Klien', href: '/klien', siap: true },
  { label: 'Lowongan', href: '/lowongan', siap: true },
  { label: 'Kandidat', href: '/kandidat', siap: true },
  { label: 'Pipeline', href: '/pipeline', siap: false },
  { label: 'Penempatan', href: '/penempatan', siap: false, hanyaOwner: true },
  { label: 'Tagihan', href: '/tagihan', siap: false, hanyaOwner: true },
]

export default async function TataLetakInternal({ children }: { children: React.ReactNode }) {
  const sesi = await auth()
  if (!sesi?.user) redirect('/masuk')

  const peran = sesi.user.role
  // Peran `recruiter` tidak pernah melihat nilai fee, tagihan, atau laporan
  // pendapatan (CLAUDE.md poin 8). Menunya pun tidak ditampilkan.
  const menuTerlihat = MENU.filter((m) => !m.hanyaOwner || peran === 'owner')

  return (
    <div className="min-h-screen">
      {/*
        Menu tampil di SEMUA ukuran layar.

        Sebelumnya ia disembunyikan di bawah 768px. Akibatnya pemilik yang
        membuka sistem ini dari HP bisa masuk lalu mentok di dasbor — tidak ada
        satu pun tautan menuju Klien, Lowongan, atau Kandidat. SPEC §13 memang
        menolak aplikasi seluler, tapi yang diminta sebagai gantinya adalah web
        yang responsif, dan menu yang hilang bukan itu.

        Di layar sempit menunya bisa digeser mendatar, bukan dilipat ke balik
        tombol — supaya seluruh tujuan tetap terlihat sekilas tanpa perlu diklik
        dulu.
      */}
      <header className="border-b border-[var(--color-garis)] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/dasbor" className="shrink-0 text-sm font-semibold">
            Modul Headhunter
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm leading-tight">{sesi.user.name}</p>
              <p className="text-xs leading-tight text-[var(--color-redup)]">
                {peran === 'owner' ? 'Pemilik' : 'Perekrut'}
              </p>
            </div>
            <form action={aksiKeluar}>
              <Button type="submit" variant="garis" size="kecil">
                Keluar
              </Button>
            </form>
          </div>
        </div>

        <nav className="mx-auto max-w-6xl overflow-x-auto px-2 pb-2">
          <div className="flex items-center gap-1">
            {menuTerlihat.map((m) =>
              m.siap ? (
                <Link
                  key={m.href}
                  href={m.href}
                  className="rounded-md px-3 py-1.5 text-sm whitespace-nowrap text-[var(--color-tinta)] hover:bg-[var(--color-permukaan)]"
                >
                  {m.label}
                </Link>
              ) : (
                <span
                  key={m.href}
                  title="Belum dibangun"
                  className="cursor-default rounded-md px-3 py-1.5 text-sm whitespace-nowrap text-[var(--color-redup)] opacity-60"
                >
                  {m.label}
                </span>
              ),
            )}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  )
}
