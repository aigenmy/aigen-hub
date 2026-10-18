import type { NextConfig } from 'next';

// next-intl's plugin is not used: it loads @swc/core for message extraction we do not need, and that native
// add-on refuses to start on Michael's PC (folder-permission check). The plugin's only job for us is this alias.
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  reactStrictMode: true,
  transpilePackages: ['@hub/db', '@hub/i18n', '@hub/legal', '@hub/modules', '@hub/ui'],
  serverExternalPackages: ['postgres', 'embedded-postgres'],
  turbopack: {
    resolveAlias: { 'next-intl/config': './i18n/request.ts' },
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
