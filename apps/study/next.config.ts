import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@ants/ui', '@ants/calculator', '@ants/shared-types', '@ants/auth-client'],
};

export default nextConfig;

