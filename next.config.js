/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true, // This might be default strictly in 14, but okay to keep if 13.
  },
  output: 'standalone',
}

module.exports = nextConfig
