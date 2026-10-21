/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  },
  // Static portfolio (built from the Astro project into public/portfolio)
  async rewrites() {
    return [
      { source: '/portfolio', destination: '/portfolio/index.html' },
    ];
  },
  async headers() {
    const week = 'public, max-age=604800, stale-while-revalidate=86400';
    return [
      { source: '/fonts/:file*', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
      { source: '/mascot/:file*', headers: [{ key: 'Cache-Control', value: week }] },
      ...['/logo-:name.png', '/logo-:name.webp', '/icon-:size.png', '/apple-touch-icon.png', '/favicon.ico']
        .map(source => ({ source, headers: [{ key: 'Cache-Control', value: week }] })),
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'mo-db.zenova.services',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3001',
        pathname: '/uploads/**',
      },
    ],
  },
};
module.exports = nextConfig;
