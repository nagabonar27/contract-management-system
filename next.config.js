/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true, // This might be default strictly in 14, but okay to keep if 13.
  },
  output: 'standalone',
  rewrites: async () => {
    return [
      {
        source: '/api/:path*',
        destination:
          process.env.NODE_ENV === 'development'
            ? 'http://127.0.0.1:5328/api/:path*'
            : '/api/',
      },
    ]
  },
}

module.exports = nextConfig
