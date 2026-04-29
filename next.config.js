/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingIncludes: {
    '/api/**': ['./data/**'],
  },
};
module.exports = nextConfig;
