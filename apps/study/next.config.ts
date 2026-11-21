import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@ants/ui', '@ants/calculator', '@ants/shared-types'],
};

export default nextConfig;

