/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        destination: 'https://fleetcmd.onrender.com/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
