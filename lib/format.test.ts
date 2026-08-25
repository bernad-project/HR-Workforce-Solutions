import { describe, expect, it } from 'vitest'
import { formatPersen, formatRupiah, formatTanggal } from './format'

describe('formatRupiah', () => {
  it('memakai titik sebagai pemisah ribuan, tanpa desimal', () => {
    expect(formatRupiah(6_980_667n)).toBe('Rp6.980.667')
    expect(formatRupiah(1_234_567n)).toBe('Rp1.234.567')
    expect(formatRupiah(0n)).toBe('Rp0')
    expect(formatRupiah(999n)).toBe('Rp999')
  })

  it('menampilkan tanda minus di depan Rp', () => {
    expect(formatRupiah(-1_000n)).toBe('-Rp1.000')
  })

  it('tidak kehilangan ketelitian pada nilai yang melebihi batas aman `number`', () => {
    // 9.007.199.254.740.993 adalah satu di atas Number.MAX_SAFE_INTEGER.
    // Lewat `number`, angka ini terbaca sebagai ...992 — satu rupiah menguap.
    const besar = 9_007_199_254_740_993n
    expect(formatRupiah(besar)).toBe('Rp9.007.199.254.740.993')
  })
})

describe('formatPersen', () => {
  it('mengubah pecahan NUMERIC(5,4) menjadi persen', () => {
    expect(formatPersen('0.1500')).toBe('15%')
    expect(formatPersen('0.0200')).toBe('2%')
    expect(formatPersen('0.1100')).toBe('11%')
    expect(formatPersen('0.5000')).toBe('50%')
  })

  it('mempertahankan pecahan persen bila ada', () => {
    expect(formatPersen('0.1250')).toBe('12,5%')
  })
})

describe('formatTanggal', () => {
  it('menampilkan tanggal bisnis apa adanya, tanpa pergeseran zona waktu', () => {
    expect(formatTanggal('2026-09-15')).toBe('15 September 2026')
    expect(formatTanggal('2026-01-01')).toBe('1 Januari 2026')
    // Tanggal 1 di awal hari adalah kasus yang paling sering bergeser jadi
    // tanggal 31 bulan sebelumnya bila sempat dilewatkan ke `new Date()`.
    expect(formatTanggal('2026-12-01')).toBe('1 Desember 2026')
  })
})
