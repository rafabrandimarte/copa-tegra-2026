/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    outputFileTracingIncludes: {
      '/api/rankings': ['./data/db.json'],
      '/api/upload': ['./data/db.json'],
      '/api/auth': ['./data/db.json'],
      '/api/vgv': ['./data/db.json'],
      '/api/corretor': ['./data/db.json'],
    },
  },
};
module.exports = nextConfig;
