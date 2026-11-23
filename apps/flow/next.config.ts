import type { NextConfig } from 'next';

const isStaticExport = process.env.CF_STATIC_EXPORT === '1';

const nextConfig: NextConfig = {
  transpilePackages: ['@ants/ui', '@ants/shared-types', '@ants/auth-client'],
  ...(isStaticExport
    ? {
        output: 'export' as const,
        images: { unoptimized: true },
      }
    : {
        async headers() {
          return [
            {
              // The PWA service worker must never be served stale and must control the whole origin.
              source: '/sw.js',
              headers: [
                { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
                { key: 'Service-Worker-Allowed', value: '/' },
              ],
            },
          ];
        },
      }),
};

export default nextConfig;

