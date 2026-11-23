import type { NextConfig } from 'next';

const isStaticExport = process.env.CF_STATIC_EXPORT === '1';

const nextConfig: NextConfig = {
  transpilePackages: ['@ants/ui', '@ants/calculator', '@ants/shared-types', '@ants/auth-client'],
  ...(isStaticExport
    ? {
        output: 'export' as const,
        images: { unoptimized: true },
      }
    : {}),
};

export default nextConfig;

