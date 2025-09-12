import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV !== 'production';

const nextConfig: NextConfig = {
  async rewrites() {
    if (isDev) {
      return [
        {
          source: '/.netlify/functions/:path*',
          destination: 'http://localhost:9999/.netlify/functions/:path*',
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
