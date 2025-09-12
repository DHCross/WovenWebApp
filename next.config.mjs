/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production';
const useNetlifyProxy = process.env.USE_NETLIFY_DEV === 'true';

const nextConfig = {
  async rewrites() {
    if (!isDev) return [];

    // In dev we support two modes:
    // 1) Netlify Dev running (functions on :9999) when USE_NETLIFY_DEV=true
    // 2) Next.js only: map \/.netlify\/functions/* to internal Next API routes
    if (useNetlifyProxy) {
      return [
        {
          source: '/.netlify/functions/:path*',
          destination: 'http://localhost:9999/.netlify/functions/:path*',
        },
      ];
    }

    return [
      {
        source: '/.netlify/functions/:path*',
        destination: '/api/:path*',
      },
    ];
  },
};

export default nextConfig;
