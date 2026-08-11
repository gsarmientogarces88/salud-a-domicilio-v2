/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Production VPS builds should not fail if eslint isn't installed.
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
