import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  /* Skip TypeScript type checking during build to save memory */
  /* Run 'pnpm type-check' separately if needed */
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'nolimitflix.com',
      },
    ],
  },
  /* Disable source maps in production to save memory */
  productionBrowserSourceMaps: false,
};

export default nextConfig;
