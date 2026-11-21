import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@ants/ui', '@ants/shared-types'],
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
};

export default nextConfig;

