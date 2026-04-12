/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    domains: [],
  },
  // Neon serverless driver needs this for edge compatibility
  experimental: {
    serverComponentsExternalPackages: ['@neondatabase/serverless'],
  },
};

module.exports = nextConfig;
