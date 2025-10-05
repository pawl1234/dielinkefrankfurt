import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // ESLint is now enabled during builds to ensure code quality
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.public.blob.vercel-storage.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9966',
      },
    ],
  },
}

export default nextConfig