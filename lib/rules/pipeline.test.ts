import { describe, expect, it } from 'vitest'
import { cekMasaProteksi } from './proteksi'
import { nomorHari, selisihHari } from './tanggal'
import {
  apakahTahapAkhir,
  LABEL_TAHAP,
  nomorTahap,
  periksaPerpindahan,
  pilihanPerpindahan,
  sudahSampaiKlien,
  tahapBerikutnya,
  URUTAN_TAHAP,
} from './tahapan'

describe('selisihHari', () => {
  it('menghitung jarak dua tanggal tanpa lewat objek Date', () => {
    expect(selisihHari('2026-08-26', '2026-08-27')).toBe(1)
    expect(selisihHari('2026-08-27', '2026-08-26')).toBe(-1)
    expect(selisihHari('2026-08-26', '2026-08-26')).toBe(0)
    expect(selisihHari('2026-01-01', '2027-01-01')).toBe(365)
  })

  it('memperhitungkan tahun kabisat', () => {
    // 2028 kabisat: 29 Februari ikut dihitung.
    expect(selisihHari('2028-01-01', '2029-01-01')).toBe(366)
    expect(selisihHari('2028-02-28', '2028-03-01')).toBe(2)
    expect(selisihHari('2027-02-28', '2027-03-01')).toBe(1)
  })

  it('menyeberangi pergantian abad', () => {
    // 1900 bukan kabisat, 2000 kabisat.
    expect(selisihHari('2000-02-28', '2000-03-01')).toBe(2)
    expect(nomorHari('1970-01-01')).toBe(0)
  })
})

describe('cekMasaProteksi', () => {
  it('melindungi sepanjang masa yang disepakati', () => {
    const hasil = cekMasaProteksi('2026-01-15', 12, '2026-06-01')
    expect(hasil.terlindungi).toBe(true)
    expect(hasil.berakhirPada).toBe('2027-01-15')
  })

  /**
   * Inilah batas yang disebut CLAUDE.md: "batas tepat 12 bulan". Sehari
   * sebelum, tepat pada hari itu, dan sehari sesudah.
   */
  it('batas tepat 12 bulan', () => {
    const sebelum = cekMasaProteksi('2026-01-15', 12, '2027-01-14')
    expect(sebelum.terlindungi).toBe(true)
    expect(sebelum.sisaHari).toBe(1)

    const tepat = cekMasaProteksi('2026-01-15', 12, '2027-01-15')
    expect(tepat.terlindungi).toBe(true)
    expect(tepat.sisaHari).toBe(0)

    const sesudah = cekMasaProteksi('2026-01-15', 12, '2027-01-16')
    expect(sesudah.terlindungi).toBe(false)
    expect(sesudah.sisaHari).toBe(-1)
  })

  it('menangani tanggal yang tidak ada di bulan tujuan', () => {
    // 31 Agustus + 6 bulan: Februari tidak punya tanggal 31.
    expect(cekMasaProteksi('2026-08-31', 6, '2027-02-28').berakhirPada).toBe('2027-02-28')
    // 29 Februari tahun kabisat + 12 bulan jatuh ke 28 Februari.
    expect(cekMasaProteksi('2028-02-29', 12, '2029-02-28').terlindungi).toBe(true)
    expect(cekMasaProteksi('2028-02-29', 12, '2029-03-01').terlindungi).toBe(false)
  })

  it('menghormati masa proteksi yang bukan 12 bulan', () => {
    expect(cekMasaProteksi('2026-01-15', 6, '2026-08-01').terlindungi).toBe(false)
    expect(cekMasaProteksi('2026-01-15', 24, '2027-08-01').terlindungi).toBe(true)
  })

  it('menghitung sisa hari yang sama dengan jarak kalender', () => {
    const hasil = cekMasaProteksi('2026-08-26', 12, '2027-08-01')
    expect(hasil.berakhirPada).toBe('2027-08-26')
    expect(hasil.sisaHari).toBe(25)
  })
})

describe('urutan tahap', () => {
  it('sesuai SPEC §6.1', () => {
    expect([...URUTAN_TAHAP]).toEqual([
      'sourced',
      'screened',
      'interviewed_internal',
      'submitted_to_client',
      'client_interview',
      'offer',
      'signed',
      'started',
      'guarantee_passed',
    ])
  })

  it('tahap penutup tidak punya nomor urut', () => {
    expect(nomorTahap('rejected')).toBeNull()
    expect(nomorTahap('withdrawn')).toBeNull()
    expect(apakahTahapAkhir('rejected')).toBe(true)
    expect(apakahTahapAkhir('sourced')).toBe(false)
  })

  it('tahu mana yang sudah sampai ke klien', () => {
    expect(sudahSampaiKlien('interviewed_internal')).toBe(false)
    expect(sudahSampaiKlien('submitted_to_client')).toBe(true)
    expect(sudahSampaiKlien('signed')).toBe(true)
    expect(sudahSampaiKlien('rejected')).toBe(false)
  })

  it('setiap tahap punya label Bahasa Indonesia', () => {
    for (const tahap of [...URUTAN_TAHAP, 'rejected', 'withdrawn'] as const) {
      expect(LABEL_TAHAP[tahap]).toBeTruthy()
    }
  })

  it('tahap berikutnya berhenti di ujung', () => {
    expect(tahapBerikutnya('sourced')).toBe('screened')
    expect(tahapBerikutnya('guarantee_passed')).toBeNull()
    expect(tahapBerikutnya('rejected')).toBeNull()
  })
})

describe('periksaPerpindahan', () => {
  it('maju satu tahap selalu boleh', () => {
    for (let i = 0; i < URUTAN_TAHAP.length - 1; i++) {
      const hasil = periksaPerpindahan(URUTAN_TAHAP[i]!, URUTAN_TAHAP[i + 1]!, 'recruiter')
      expect(hasil.boleh).toBe(true)
      if (hasil.boleh) expect(hasil.perluCatatan).toBe(false)
    }
  })

  it('perekrut tidak boleh melompat maju', () => {
    const hasil = periksaPerpindahan('sourced', 'signed', 'recruiter')
    expect(hasil.boleh).toBe(false)
    if (!hasil.boleh) expect(hasil.alasan).toContain('satu langkah')
  })

  it('pemilik boleh melompat maju, tapi wajib beralasan', () => {
    const hasil = periksaPerpindahan('sourced', 'signed', 'owner')
    expect(hasil.boleh).toBe(true)
    if (hasil.boleh) expect(hasil.perluCatatan).toBe(true)
  })

  it('mundur boleh untuk siapa pun', () => {
    const hasil = periksaPerpindahan('offer', 'screened', 'recruiter')
    expect(hasil.boleh).toBe(true)
    if (hasil.boleh) expect(hasil.perluCatatan).toBe(false)
  })

  it('menutup pengajuan boleh dari tahap mana pun', () => {
    for (const tahap of URUTAN_TAHAP) {
      expect(periksaPerpindahan(tahap, 'rejected', 'recruiter').boleh).toBe(true)
      expect(periksaPerpindahan(tahap, 'withdrawn', 'recruiter').boleh).toBe(true)
    }
  })

  it('membuka kembali pengajuan yang ditutup wajib beralasan', () => {
    const hasil = periksaPerpindahan('rejected', 'screened', 'recruiter')
    expect(hasil.boleh).toBe(true)
    if (hasil.boleh) expect(hasil.perluCatatan).toBe(true)
  })

  it('menolak perpindahan ke tahap yang sama', () => {
    expect(periksaPerpindahan('offer', 'offer', 'owner').boleh).toBe(false)
  })
})

describe('pilihanPerpindahan', () => {
  /**
   * Kotak pilihan memakai isian pertama sebagai nilai bawaannya. Kalau
   * urutannya mengikuti urutan enum, pengajuan yang sudah `signed` terbuka
   * dengan bawaan `sourced` — mundur sembilan tahap hanya karena tidak ada yang
   * mengubahnya.
   */
  it('menaruh tahap berikutnya paling depan', () => {
    expect(pilihanPerpindahan('signed', 'recruiter')[0]?.tahap).toBe('started')
    expect(pilihanPerpindahan('sourced', 'recruiter')[0]?.tahap).toBe('screened')
    expect(pilihanPerpindahan('offer', 'owner')[0]?.tahap).toBe('signed')
  })

  it('menaruh tahap mundur paling belakang, yang terdekat lebih dulu', () => {
    const daftar = pilihanPerpindahan('signed', 'recruiter').map((p) => p.tahap)
    const mundur = daftar.slice(daftar.indexOf('offer'))
    expect(mundur).toEqual([
      'offer',
      'client_interview',
      'submitted_to_client',
      'interviewed_internal',
      'screened',
      'sourced',
    ])
  })

  it('perekrut tidak ditawari lompatan maju sama sekali', () => {
    const daftar = pilihanPerpindahan('sourced', 'recruiter').map((p) => p.tahap)
    expect(daftar).not.toContain('signed')
    expect(daftar).not.toContain('submitted_to_client')
    expect(daftar).toContain('screened')
  })

  it('pemilik ditawari lompatan maju setelah tahap berikutnya', () => {
    const daftar = pilihanPerpindahan('sourced', 'owner').map((p) => p.tahap)
    expect(daftar[0]).toBe('screened')
    expect(daftar).toContain('signed')
    expect(daftar.indexOf('signed')).toBeLessThan(daftar.indexOf('rejected'))
  })

  it('hanya berisi perpindahan yang memang boleh', () => {
    for (const peran of ['owner', 'recruiter'] as const) {
      for (const tahap of [...URUTAN_TAHAP, 'rejected', 'withdrawn'] as const) {
        for (const p of pilihanPerpindahan(tahap, peran)) {
          expect(p.tahap).not.toBe(tahap)
          expect(periksaPerpindahan(tahap, p.tahap, peran).boleh).toBe(true)
        }
      }
    }
  })

  it('dari tahap penutup, seluruh pilihannya wajib beralasan', () => {
    for (const p of pilihanPerpindahan('rejected', 'recruiter')) {
      if (p.tahap === 'withdrawn') continue
      expect(p.izin.perluCatatan).toBe(true)
    }
  })
})
