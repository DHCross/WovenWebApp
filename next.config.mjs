/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // keep if you're on App Router (app/ directory)
    typedRoutes: false,
  },
};

export default nextConfig;
