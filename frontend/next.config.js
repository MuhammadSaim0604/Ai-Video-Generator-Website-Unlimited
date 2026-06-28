/** @type {import('next').NextConfig} */
const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || 'http://localhost:3001';

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'media.pixverse.ai' },
      { protocol: 'https', hostname: 'pixverse-fe-upload.oss-accelerate.aliyuncs.com' },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/api/:path*`,
      },
      {
        source: '/admin-api/:path*',
        destination: `${BACKEND_URL}/admin/:path*`,
      },
      // socket.io base (no path segment — must come before the wildcard)
      {
        source: '/socket.io',
        destination: `${BACKEND_URL}/socket.io`,
      },
      // socket.io with sub-path
      {
        source: '/socket.io/:path*',
        destination: `${BACKEND_URL}/socket.io/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
