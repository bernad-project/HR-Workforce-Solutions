/**
 * Menjalankan 10 uji aturan bisnis di `docs/test_rules.sql`.
 *
 *   npm run db:test-rules
 *
 * CLAUDE.md "Pengujian": jalankan ini setiap kali skema disentuh. Sepuluh-duanya
 * harus tetap berperilaku seperti yang tertulis di komentarnya.
 *
 * Skrip ini MENGOSONGKAN basis data sasaran lalu membangunnya ulang dari
 * `docs/schema.sql`, karena uji ini memasukkan data contoh dengan ID tetap.
 * Karena itu ia menolak jalan ke basis data produksi: sasarannya harus
 * TEST_DATABASE_URL, atau DATABASE_URL yang menunjuk ke Postgres di komputer
 * sendiri.
 */
import { AKAR } from './env.mts'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Client } from 'pg'


type Potongan =
  | { jenis: 'judul'; teks: string }
  | { jenis: 'pernyataan'; sql: string; baris: number }

/**
 * Memisahkan berkas .sql menjadi pernyataan, sambil menangkap `\echo` sebagai
 * judul. Perintah psql lain (`\set`, `\pset`) diabaikan.
 *
 * Pemisahan menghormati kutip tunggal dan dollar-quote, supaya titik koma di
 * dalam teks tidak salah dianggap akhir pernyataan.
 */
function pisahkan(isi: string): Potongan[] {
  const hasil: Potongan[] = []
  let buffer = ''
  let baris = 1
  let barisMulai = 1
  let i = 0

  const simpanPernyataan = () => {
    const sql = buffer.trim()
    if (sql) hasil.push({ jenis: 'pernyataan', sql, baris: barisMulai })
    buffer = ''
    barisMulai = baris
  }

  const diAwalBaris = () => buffer.length === 0 || /\n[ \t]*$/.test(buffer)

  while (i < isi.length) {
    const c = isi[i]!

    if (c === '\n') baris++

    // Perintah psql: hanya di awal baris, dan hanya di luar pernyataan.
    if (c === '\\' && diAwalBaris() && buffer.trim() === '') {
      const akhir = isi.indexOf('\n', i)
      const perintah = isi.slice(i, akhir === -1 ? isi.length : akhir)
      const echo = /^\\echo\s+'([\s\S]*)'\s*$/.exec(perintah.trim())
      if (echo) hasil.push({ jenis: 'judul', teks: echo[1] ?? '' })
      else if (/^\\echo\s*$/.test(perintah.trim())) hasil.push({ jenis: 'judul', teks: '' })
      i = akhir === -1 ? isi.length : akhir + 1
      baris++
      buffer = ''
      barisMulai = baris
      continue
    }

    // Komentar baris.
    if (c === '-' && isi[i + 1] === '-') {
      const akhir = isi.indexOf('\n', i)
      i = akhir === -1 ? isi.length : akhir
      continue
    }

    // Kutip tunggal, dengan '' sebagai escape.
    if (c === "'") {
      buffer += c
      i++
      while (i < isi.length) {
        const d = isi[i]!
        if (d === '\n') baris++
        buffer += d
        i++
        if (d === "'") {
          if (isi[i] === "'") {
            buffer += "'"
            i++
            continue
          }
          break
        }
      }
      continue
    }

    // Dollar-quote: $tag$ ... $tag$
    if (c === '$') {
      const cocok = /^\$[A-Za-z_]*\$/.exec(isi.slice(i))
      if (cocok) {
        const penanda = cocok[0]
        const akhir = isi.indexOf(penanda, i + penanda.length)
        const potong = akhir === -1 ? isi.slice(i) : isi.slice(i, akhir + penanda.length)
        baris += (potong.match(/\n/g) ?? []).length
        buffer += potong
        i += potong.length
        continue
      }
    }

    if (c === ';') {
      buffer += c
      simpanPernyataan()
      i++
      continue
    }

    buffer += c
    i++
  }

  simpanPernyataan()
  return hasil
}

function pilihSasaran(): string {
  const uji = process.env.TEST_DATABASE_URL?.trim()
  if (uji) return uji

  const utama = process.env.DATABASE_URL?.trim()
  if (utama && (utama.includes('localhost') || utama.includes('127.0.0.1'))) return utama

  console.error(
    'Uji ini mengosongkan basis data sasaran, jadi ia menolak jalan ke basis data\n' +
      'yang bukan basis data uji.\n\n' +
      'Isi TEST_DATABASE_URL di .env.local dengan basis data terpisah untuk pengujian,\n' +
      'atau arahkan DATABASE_URL ke Postgres di komputer sendiri (localhost).',
  )
  process.exit(1)
}

async function utama(): Promise<void> {
  const url = pilihSasaran()
  const lokal = url.includes('localhost') || url.includes('127.0.0.1')

  const client = new Client({
    connectionString: url,
    ssl: lokal ? undefined : { rejectUnauthorized: true },
  })
  await client.connect()

  console.log('Membangun ulang basis data uji dari docs/schema.sql ...')
  await client.query('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;')
  await client.query(readFileSync(resolve(AKAR, 'docs/schema.sql'), 'utf8'))

  const potongan = pisahkan(readFileSync(resolve(AKAR, 'docs/test_rules.sql'), 'utf8'))

  let judulTerakhir = ''
  let lulus = 0
  let gagal = 0
  const kegagalan: string[] = []

  /**
   * Penanda `Harapan: ERROR` berlaku untuk SATU KELOMPOK pernyataan, bukan untuk
   * pernyataan berikutnya saja. Uji 8, misalnya, memasukkan dua baris persiapan
   * dulu (kandidat dan pengajuan) sebelum sampai ke pernyataan yang memang harus
   * ditolak basis data. Karena itu harapan dianggap terpenuhi begitu ada satu
   * pernyataan di kelompok itu yang ditolak, dan baru dinyatakan gagal bila
   * kelompoknya berakhir tanpa satu pun penolakan.
   */
  let menungguGalat = false
  let barisHarapan = 0

  const tutupHarapan = () => {
    if (!menungguGalat) return
    gagal++
    kegagalan.push(
      `${judulTerakhir || 'pernyataan'} (sekitar baris ${barisHarapan}) — ` +
        'seharusnya ada pernyataan yang DITOLAK basis data, tapi semuanya berhasil',
    )
    console.log('  GAGAL: tidak ada pernyataan yang ditolak, padahal seharusnya ada')
    menungguGalat = false
  }

  for (const p of potongan) {
    if (p.jenis === 'judul') {
      if (/^Harapan:\s*ERROR/i.test(p.teks)) {
        menungguGalat = true
      } else if (/^===/.test(p.teks.trim())) {
        // Judul bagian baru menutup kelompok sebelumnya.
        tutupHarapan()
        judulTerakhir = p.teks.trim()
      }
      console.log(p.teks)
      continue
    }

    if (menungguGalat) barisHarapan ||= p.baris
    const label = `${judulTerakhir || 'pernyataan'} (baris ${p.baris})`

    try {
      const hasil = await client.query(p.sql)
      if (Array.isArray(hasil.rows) && hasil.rows.length > 0) {
        console.table(hasil.rows)
      }
    } catch (galat) {
      const pesan = galat instanceof Error ? galat.message : String(galat)
      if (menungguGalat) {
        lulus++
        menungguGalat = false
        barisHarapan = 0
        console.log(`  LULUS: ditolak basis data — ${pesan}`)
      } else {
        gagal++
        kegagalan.push(`${label} — ${pesan}`)
        console.log(`  GAGAL: ${pesan}`)
      }
    }
  }

  tutupHarapan()

  // Pemeriksaan pokok: dua tagihan harus berjumlah persis fee_amount (SPEC §5.2).
  const jumlah = await client.query<{ fee: string; total: string }>(
    `SELECT p.fee_amount::text AS fee, SUM(i.gross_amount)::text AS total
       FROM placements p JOIN invoices i ON i.placement_id = p.id
      GROUP BY p.id, p.fee_amount`,
  )
  for (const baris of jumlah.rows) {
    if (BigInt(baris.fee) === BigInt(baris.total)) {
      lulus++
    } else {
      gagal++
      kegagalan.push(`Jumlah dua tagihan ${baris.total} tidak sama dengan fee ${baris.fee}`)
    }
  }

  console.log('')
  console.log('==============================================')
  console.log(`Ringkasan: ${lulus} lulus, ${gagal} gagal`)
  for (const k of kegagalan) console.log(`  · ${k}`)
  console.log('==============================================')

  await client.end()
  if (gagal > 0) process.exit(1)
}

utama().catch((galat: unknown) => {
  console.error('Uji aturan gagal dijalankan:', galat instanceof Error ? galat.message : galat)
  process.exit(1)
})
