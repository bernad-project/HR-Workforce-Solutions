import { POIN_PEMBERITAHUAN, VERSI_PEMBERITAHUAN_BERLAKU } from '@/lib/pdp'

/**
 * Teks pemberitahuan pemrosesan data pribadi yang harus dibacakan ke kandidat
 * sebelum datanya dimasukkan (SPEC §9.1).
 *
 * Ditampilkan utuh di layar, bukan disembunyikan di balik tautan. Perekrut yang
 * mengisi form ini perlu tahu persis apa yang ia janjikan ke kandidat, karena
 * dialah yang menyampaikannya.
 */
export function PemberitahuanPdp() {
  return (
    <div className="rounded-lg border border-[var(--color-utama)] bg-[var(--color-utama-redup)] p-5">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-[var(--color-utama)]">
          Pemberitahuan pemrosesan data pribadi
        </h2>
        <span className="angka text-xs text-[var(--color-utama)]">
          versi {VERSI_PEMBERITAHUAN_BERLAKU}
        </span>
      </div>
      <p className="mb-3 text-xs text-[var(--color-utama)]">
        Sampaikan isi ini ke kandidat sebelum datanya dimasukkan. UU No. 27 Tahun 2022 mewajibkan
        persetujuan yang diberikan dengan tahu apa yang disetujui.
      </p>
      <ul className="space-y-2">
        {POIN_PEMBERITAHUAN.map((poin, i) => (
          <li key={i} className="flex gap-2 text-sm text-[var(--color-tinta)]">
            <span className="angka shrink-0 text-[var(--color-utama)]">{i + 1}.</span>
            <span>{poin}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
