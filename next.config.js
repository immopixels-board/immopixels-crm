/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  productionBrowserSourceMaps: false,
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js'],
  },
  // Disable ALL static generation - this app is fully dynamic
  staticPageGenerationTimeout: 0,
  generateBuildId: async () => 'immopixels-crm',
}

// Override the page export to force dynamic
module.exports = nextConfig
