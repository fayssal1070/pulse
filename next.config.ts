import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  serverExternalPackages: ['@prisma/client'],
  env: {
    // Expose Vercel deployment info to client (admin only usage)
    NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV || 'development',
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA || 'local',
    // UI Debug flag (admin only)
    NEXT_PUBLIC_UI_DEBUG: process.env.NEXT_PUBLIC_UI_DEBUG || 'false',
  },
};

export default nextConfig;
