/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  output: 'standalone',
  env: {
    NEXT_PUBLIC_PROMETHEUS_URL: process.env.NEXT_PUBLIC_PROMETHEUS_URL || 'http://localhost:9090',
    NEXT_PUBLIC_SERVICES_BASE_URL: process.env.NEXT_PUBLIC_SERVICES_BASE_URL || 'http://localhost',
  },
}

module.exports = nextConfig
