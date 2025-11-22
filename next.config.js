/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  experimental: {
    turbo: false,  // Desactiva Turbopack
  },
};

module.exports = nextConfig;