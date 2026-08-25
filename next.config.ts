import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // `pg` adalah driver Postgres berbasis TCP. Ia harus dijalankan apa adanya di
  // sisi server, bukan ikut di-bundle, supaya koneksi ke Neon tidak putus.
  serverExternalPackages: ['pg'],
  typescript: {
    ignoreBuildErrors: false,
  },
}

export default nextConfig
