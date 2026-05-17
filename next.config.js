/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  productionBrowserSourceMaps: true,
  swcMinify: false,
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js'],
  },
}
module.exports = nextConfig
