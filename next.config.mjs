import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // experimental.typedRoutes has been moved to typedRoutes
  typedRoutes: false,
  // Fix for multiple lockfiles warning - specify the correct project root
  outputFileTracingRoot: resolve(__dirname),
};

export default nextConfig;
