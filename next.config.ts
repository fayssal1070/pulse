import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  serverExternalPackages: ['@prisma/client'],
  // Désactiver Turbopack pour le build (fix Prisma + Next.js 16)
  experimental: {
    turbo: false,
  },
  env: {
    // Expose Vercel deployment info to client (admin only usage)
    NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV || 'development',
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA || 'local',
  },
};

export default nextConfig;
