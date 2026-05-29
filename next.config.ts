import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",

  // Hide X-Powered-By header — prevents framework fingerprinting
  poweredByHeader: false,

  // React compiler: automatic memoization (React 19).
  // Moved to top-level in Next.js 16.
  reactCompiler: true,

  // Bundle analyzer — run with ANALYZE=true bun build
  ...(process.env.ANALYZE === 'true'
    ? { bundleAnalyzer: { enabled: true } }
    : {}),

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
  },

  // Compression
  compress: true,

  // Turbopack is the default bundler in Next.js 16.
  // Empty config to silence "no turbopack config" warning when
  // the previous webpack config is no longer needed.
  turbopack: {},

  // Security headers applied to all routes
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
