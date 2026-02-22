import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Skip TypeScript type checking during build to save memory */
  /* Run 'pnpm type-check' separately if needed */
  typescript: {
    ignoreBuildErrors: true,
  },
  /* Use SWC for faster minification */
  swcMinify: true,
  /* Disable source maps in production to save memory */
  productionBrowserSourceMaps: false,
};

export default nextConfig;
