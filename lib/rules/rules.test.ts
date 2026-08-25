import { describe, expect, it } from 'vitest'
import { pecahanKePersen, persenKePecahan, uraiRupiah, uraiRupiahOpsional } from './uang'
import { adalahKabisat, hitungRetentionUntil, tambahBulan, tambahHari } from './tanggal'
import { normalisasiEmail, normalisasiTelepon, teleponKeWa } from './duplikat'

describe('uraiRupiah', () => {
  it('menerima bentuk yang biasa diketik orang', () => {
    expect(uraiRupiah('8333333')).toBe(8_333_333n)
    expect(uraiRupiah('8.333.333')).toBe(8_333_333n)
    expect(uraiRupiah('Rp8.333.333')).toBe(8_333_333n)
    expect(uraiRupiah('Rp 8.333.333')).toBe(8_333_333n)
    expect(uraiRupiah('  8 333 333 ')).toBe(8_333_333n)
  })

  it('menolak yang bukan angka', () => {
    expect(() => uraiRupiah('delapan juta')).toThrow()
    expect(() => uraiRupiah('')).toThrow()
    expect(() => uraiRupiah('8jt')).toThrow()
  })

  it('tidak kehilangan ketelitian pada nilai besar', () => {
    // Lewat `number`, angka ini terbaca ...992 dan satu rupiah menguap.
    expect(uraiRupiah('9007199254740993')).toBe(9_007_199_254_740_993n)
  })

  it('mengembalikan null untuk isian opsional yang kosong', () => {
    expect(uraiRupiahOpsional('')).toBeNull()
    expect(uraiRupiahOpsional('   ')).toBeNull()
    expect(uraiRupiahOpsional(null)).toBeNull()
    expect(uraiRupiahOpsional('9000000')).toBe(9_000_000n)
  })
})

describe('persenKePecahan', () => {
  it('mengubah persen menjadi pecahan NUMERIC(5,4)', () => {
    expect(persenKePecahan('15')).toBe('0.1500')
    expect(persenKePecahan('12.5')).toBe('0.1250')
    expect(persenKePecahan('10')).toBe('0.1000')
    expect(persenKePecahan('30')).toBe('0.3000')
    expect(persenKePecahan('2')).toBe('0.0200')
    expect(persenKePecahan('11')).toBe('0.1100')
  })

  it('menerima koma sebagai pemisah desimal dan tanda persen', () => {
    expect(persenKePecahan('12,5')).toBe('0.1250')
    expect(persenKePecahan('15%')).toBe('0.1500')
    expect(persenKePecahan(' 17,25 ')).toBe('0.1725')
  })

  it('menolak yang bukan persentase', () => {
    expect(() => persenKePecahan('lima belas')).toThrow()
    expect(() => persenKePecahan('')).toThrow()
    expect(() => persenKePecahan('12.345')).toThrow()
  })
})

describe('pecahanKePersen', () => {
  it('mengembalikan bentuk yang enak dibaca di kotak isian', () => {
    expect(pecahanKePersen('0.1500')).toBe('15')
    expect(pecahanKePersen('0.1250')).toBe('12.5')
    expect(pecahanKePersen('0.0200')).toBe('2')
    expect(pecahanKePersen('0.3000')).toBe('30')
    expect(pecahanKePersen('0.1000')).toBe('10')
    expect(pecahanKePersen('0.1725')).toBe('17.25')
  })

  it('bolak-balik tanpa berubah nilainya', () => {
    for (const persen of ['10', '12.5', '15', '17.25', '20', '30']) {
      expect(pecahanKePersen(persenKePecahan(persen))).toBe(persen)
    }
  })
})

describe('tambahBulan', () => {
  it('memotong ke hari terakhir bila tanggalnya tidak ada di bulan tujuan', () => {
    expect(tambahBulan('2026-01-31', 1)).toBe('2026-02-28')
    expect(tambahBulan('2028-01-31', 1)).toBe('2028-02-29') // kabisat
    expect(tambahBulan('2026-03-31', 1)).toBe('2026-04-30')
  })

  it('menyeberang tahun dengan benar', () => {
    expect(tambahBulan('2026-08-25', 12)).toBe('2027-08-25')
    expect(tambahBulan('2026-12-01', 1)).toBe('2027-01-01')
    expect(tambahBulan('2026-11-15', 24)).toBe('2028-11-15')
  })

  it('menerima jumlah bulan negatif', () => {
    expect(tambahBulan('2027-01-15', -1)).toBe('2026-12-15')
  })
})

describe('tambahHari', () => {
  it('menghitung garansi 90 hari menyeberang bulan', () => {
    expect(tambahHari('2026-09-15', 90)).toBe('2026-12-14')
  })

  it('memperhitungkan tahun kabisat', () => {
    expect(tambahHari('2028-02-28', 1)).toBe('2028-02-29')
    expect(tambahHari('2026-02-28', 1)).toBe('2026-03-01')
  })

  it('menyeberang pergantian tahun', () => {
    expect(tambahHari('2026-12-31', 1)).toBe('2027-01-01')
  })
})

describe('adalahKabisat', () => {
  it('mengikuti aturan 4/100/400', () => {
    expect(adalahKabisat(2028)).toBe(true)
    expect(adalahKabisat(2026)).toBe(false)
    expect(adalahKabisat(2100)).toBe(false)
    expect(adalahKabisat(2000)).toBe(true)
  })
})

describe('hitungRetentionUntil', () => {
  it('menghitung 24 bulan sejak aktivitas terakhir', () => {
    expect(hitungRetentionUntil('2026-08-25', 24)).toBe('2028-08-25')
  })
})

describe('normalisasiTelepon', () => {
  it('menyeragamkan berbagai cara menulis nomor yang sama', () => {
    const harapan = '081234567890'
    expect(normalisasiTelepon('081234567890')).toBe(harapan)
    expect(normalisasiTelepon('0812-3456-7890')).toBe(harapan)
    expect(normalisasiTelepon('+62 812 3456 7890')).toBe(harapan)
    expect(normalisasiTelepon('+6281234567890')).toBe(harapan)
    expect(normalisasiTelepon('62 812-3456-7890')).toBe(harapan)
    expect(normalisasiTelepon('812 3456 7890')).toBe(harapan)
    expect(normalisasiTelepon('(0812) 3456-7890')).toBe(harapan)
  })

  it('membiarkan nomor asing apa adanya', () => {
    expect(normalisasiTelepon('+65 9123 4567')).toBe('+6591234567')
  })

  it('mengembalikan teks kosong untuk masukan kosong', () => {
    expect(normalisasiTelepon('   ')).toBe('')
  })
})

describe('normalisasiEmail', () => {
  it('membandingkan tanpa peduli huruf besar kecil', () => {
    expect(normalisasiEmail('  Budi.Santoso@Contoh.co.id ')).toBe('budi.santoso@contoh.co.id')
  })
})

describe('teleponKeWa', () => {
  it('mengubah nomor lokal ke bentuk yang diminta wa.me', () => {
    expect(teleponKeWa('081234567890')).toBe('6281234567890')
    expect(teleponKeWa('+62 812-3456-7890')).toBe('6281234567890')
  })
})
